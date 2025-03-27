import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'prisma/prisma.service';
import { CartService } from 'src/cart/cart.service';
import { Snap } from 'midtrans-client';
import * as crypto from 'crypto';

@Injectable()
export class SnapService {
  private snap: Snap;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    @Inject(forwardRef(() => CartService))
    private cartService: CartService,
  ) {
    const serverKey = this.configService.get<string>('MIDTRANS_SERVER_KEY');

    if (!serverKey) {
      throw new Error(
        'Server key Midtrans tidak ditemukan. Periksa konfigurasi.',
      );
    }

    // Inisialisasi dengan Snap
    this.snap = new Snap({
      isProduction: false,
      serverKey: serverKey,
      clientKey: this.configService.get<string>('MIDTRANS_CLIENT_KEY'),
    });

    console.log('Midtrans Snap initialized with server key:', serverKey);
  }

  /**
   * Membuat transaksi baru menggunakan Snap API.
   */
  async createTransaction(userId: number | null, payload: any): Promise<any> {
    console.log('Payload received:', payload);

    return this.prisma.$transaction(async (prisma) => {
      const cartItems = await this.cartService.findManyCarts({
        where: userId ? { userId } : { guestId: payload?.metadata?.guestId },
        include: { catalog: true, size: true },
      });

      if (!cartItems || cartItems.length === 0) {
        throw new Error('Keranjang belanja kosong.');
      }

      const totalAmount = cartItems.reduce((total, item) => {
        return (
          total +
          parseFloat(
            item.size.price.replace('Rp', '').replace(/,/g, '').trim(),
          ) *
            item.quantity
        );
      }, 0);

      console.log('Total amount calculated:', totalAmount);

      const midtransPayload = {
        transaction_details: {
          order_id: `order-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          gross_amount: totalAmount,
        },
        credit_card: { secure: true },
        customer_details: {
          first_name: payload?.user?.firstName || 'Guest',
          last_name: payload?.user?.lastName || 'User',
          email: payload?.user?.email || 'guest@example.com',
          phone: payload?.user?.phoneNumber || '081234567890',
        },
        item_details: cartItems.map((item) => ({
          id: item.id,
          price: parseFloat(
            item.size.price.replace('Rp', '').replace(/,/g, '').trim(),
          ),
          quantity: item.quantity,
          name: item.catalog.name,
        })),
        enabled_payments: [
          'credit_card',
          'bca_klikpay',
          'bni_va',
          'bri_va',
          'permata_va',
          'alfamart',
          'indomaret',
          'gopay',
          'shopeepay',
          'qris',
        ],
        expiry: { duration: 1, unit: 'day' },
      };

      console.log('Midtrans payload:', midtransPayload);

      try {
        const transaction = await this.snap.createTransaction(midtransPayload);
        console.log('Midtrans transaction response:', transaction);

        const savedInvoice = await prisma.invoice.create({
          data: {
            midtransOrderId: midtransPayload.transaction_details.order_id,
            status: 'PENDING',
            amount: totalAmount,
            currency: 'IDR',
            paymentUrl: transaction.redirect_url,
            userId: userId || null,
            items: {
              createMany: {
                data: cartItems.map((item) => ({
                  name: item.catalog.name,
                  quantity: item.quantity,
                  price: parseFloat(
                    item.size.price.replace('Rp', '').replace(/,/g, '').trim(),
                  ),
                  currency: 'IDR',
                })),
              },
            },
          },
          include: { items: true },
        });

        console.log('Saved invoice:', savedInvoice);

        await this.cartService.removeManyCarts({
          where: userId ? { userId } : { guestId: payload?.metadata?.guestId },
        });

        return {
          paymentLink: transaction.redirect_url,
          message:
            'Transaksi berhasil dibuat. Arahkan user ke link ini untuk menyelesaikan pembayaran.',
        };
      } catch (error) {
        console.error('Error creating transaction with Snap API:', error);
        throw new Error(
          'Gagal membuat transaksi Midtrans. Transaksi dibatalkan.',
        );
      }
    });
  }

  /**
   * Handle webhook untuk transaksi yang telah selesai.
   */
  async handleWebhook(webhookPayload: any, signature: string): Promise<any> {
    try {
      const transactionStatus = webhookPayload.transaction_status;
      const orderId = webhookPayload.order_id;
      const grossAmount = parseFloat(webhookPayload.gross_amount);

      // Cari invoice yang sesuai
      const invoice = await this.prisma.invoice.findUnique({
        where: { midtransOrderId: orderId },
        include: { payment: true },
      });

      if (!invoice) {
        throw new Error(`Invoice with order ID ${orderId} not found`);
      }

      // Jika payment belum ada, buat dulu
      if (!invoice.payment) {
        // Buat payment baru
        const payment = await this.prisma.payment.create({
          data: {
            userId: invoice.userId,
            amount: grossAmount,
            status:
              transactionStatus === 'settlement' ? 'SETTLEMENT' : 'PENDING',
            midtransPaymentId: webhookPayload.transaction_id,
            paymentMethod: webhookPayload.payment_type || 'MIDTRANS',
          },
        });

        // Update invoice dengan payment yang baru dibuat
        await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            status: transactionStatus,
            payment: {
              connect: { id: payment.id },
            },
          },
        });
      } else {
        // Jika payment sudah ada, update saja
        await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            status: transactionStatus,
            payment: {
              update: {
                status:
                  transactionStatus === 'settlement' ? 'SETTLEMENT' : 'PENDING',
                midtransPaymentId: webhookPayload.transaction_id,
              },
            },
          },
        });
      }

      console.log(
        `Invoice ${orderId} status updated to ${transactionStatus} in database.`,
      );

      return {
        message: 'Webhook processed successfully',
        status: 'updated',
      };
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw new Error('Gagal memproses webhook.');
    }
  }

  /**
   * Validasi signature untuk webhook.
   */
  private validateWebhookSignature(
    payload: any,
    signature: string,
    secretKey: string,
  ): boolean {
    const expectedSignature = this.generateSignature(payload, secretKey);
    console.log('Comparing signatures:');
    console.log('Expected:', expectedSignature);
    console.log('Received:', signature);
    return expectedSignature === signature;
  }

  /**
   * Generate signature untuk testing webhook
   */
  private generateSignature(payload: any, secretKey: string): string {
    const orderId = payload.order_id;
    const statusCode = payload.status_code;
    const grossAmount = payload.gross_amount;

    // Gabungkan data tanpa whitespace
    const stringToSign = orderId + statusCode + grossAmount + secretKey;
    const trimmedString = stringToSign.trim();

    console.log('String to sign (raw):', stringToSign);
    console.log('String to sign (trimmed):', trimmedString);

    // Gunakan createHash bukan createHmac
    const hash = crypto
      .createHash('sha512')
      .update(trimmedString)
      .digest('hex');

    console.log('Generated hash:', hash);
    return hash;
  }
}
