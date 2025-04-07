import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'prisma/prisma.service';
import { Snap } from 'midtrans-client';
import { CartService } from 'src/cart/cart.service';
import * as crypto from 'crypto';
import { CatalogService } from 'src/catalog/catalog.service';

@Injectable()
export class SnapService {
  private snap: Snap;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    @Inject(forwardRef(() => CartService))
    private cartService: CartService,
    @Inject(forwardRef(() => CatalogService))
    private catalogService: CatalogService,
  ) {
    const serverKey = this.configService.get<string>('MIDTRANS_SERVER_KEY');

    if (!serverKey) {
      throw new Error(
        'Server key Midtrans tidak ditemukan. Periksa konfigurasi.',
      );
    }

    this.snap = new Snap({
      isProduction: false,
      serverKey: serverKey,
      clientKey: this.configService.get<string>('MIDTRANS_CLIENT_KEY'),
    });
  }

  async createTransaction(userId: number | null, payload: any): Promise<any> {
    return this.prisma.$transaction(async (prisma) => {
      const cartItems = await this.cartService.findManyCarts({
        where: userId ? { userId } : { guestId: payload?.metadata?.guestId },
        include: { catalog: true, size: true },
      });

      if (!cartItems || cartItems.length === 0) {
        console.error('Cart is empty.');
        throw new Error('Keranjang belanja kosong.');
      }

      const totalAmount = cartItems.reduce((total, item) => {
        const price = parseFloat(
          item.size.price
            .replace('Rp', '')
            .replace(/\./g, '')
            .replace(/,/g, '')
            .trim(),
        );
        return total + price * item.quantity;
      }, 0);

      const formattedTotalAmount = Number(totalAmount).toFixed(2);

      const midtransPayload = {
        transaction_details: {
          order_id: `order-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          gross_amount: formattedTotalAmount,
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
            item.size.price
              .replace('Rp', '')
              .replace(/\./g, '')
              .replace(/,/g, '')
              .trim(),
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

      try {
        const transaction = await this.snap.createTransaction(midtransPayload);
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
                    item.size.price
                      .replace('Rp', '')
                      .replace(/\./g, '')
                      .replace(/,/g, '')
                      .trim(),
                  ),
                  currency: 'IDR',
                })),
              },
            },
          },
          include: { items: true },
        });

        for (const item of cartItems) {
          await this.catalogService.deductQuantity(
            item.catalogId,
            item.sizeId,
            item.quantity,
          );
        }

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

  async handleWebhook(webhookPayload: any): Promise<any> {
    try {
      const {
        order_id,
        status_code,
        gross_amount,
        transaction_status,
        transaction_id,
        payment_type,
        signature_key,
      } = webhookPayload;

      const serverKey = this.configService.get<string>('MIDTRANS_SERVER_KEY');
      if (!serverKey) {
        throw new Error('Server key not found in configuration.');
      }

      const isValidSignature = this.validateWebhookSignature(
        webhookPayload,
        signature_key,
        serverKey,
      );

      if (!isValidSignature) {
        console.error('❌ Invalid webhook signature.');
        throw new Error('Invalid webhook signature.');
      }

      const invoice = await this.prisma.invoice.findUnique({
        where: { midtransOrderId: order_id },
        include: { payment: true },
      });

      if (!invoice) {
        console.error(`❌ Invoice with order ID ${order_id} not found.`);
        throw new Error(`Invoice with order ID ${order_id} not found`);
      }

      if (!invoice.payment) {
        const payment = await this.prisma.payment.create({
          data: {
            amount: parseFloat(gross_amount),
            status: transaction_status.toUpperCase(), // bisa jadi SETTLEMENT, EXPIRE, CANCEL, dsb.
            midtransPaymentId: transaction_id,
            paymentMethod: payment_type || 'MIDTRANS',
            user: invoice.userId
              ? { connect: { id: invoice.userId } }
              : undefined,
          },
        });

        await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            status: transaction_status,
            payment: {
              connect: { id: payment.id },
            },
          },
        });
      } else {
        await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            status: transaction_status,
            payment: {
              update: {
                status:
                  transaction_status === 'settlement'
                    ? 'SETTLEMENT'
                    : 'PENDING',
                midtransPaymentId: transaction_id,
              },
            },
          },
        });
      }

      return {
        message: 'Webhook processed successfully',
        status: 'updated',
      };
    } catch (error) {
      console.error('🔥 Error handling webhook:', error);
      throw new Error('Gagal memproses webhook.');
    }
  }

  private validateWebhookSignature(
    payload: any,
    signature: string,
    secretKey: string,
  ): boolean {
    const expectedSignature = this.generateSignature(payload, secretKey);
    return expectedSignature === signature;
  }

  private generateSignature(payload: any, secretKey: string): string {
    const stringToSign =
      payload.order_id + payload.status_code + payload.gross_amount + secretKey;
    return crypto.createHash('sha512').update(stringToSign).digest('hex');
  }
}
