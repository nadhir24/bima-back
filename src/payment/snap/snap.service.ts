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
    @Inject(forwardRef(() => CatalogService)) // Use forwardRef here
    private catalogService: CatalogService,
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
    console.log('Payload received in createTransaction:', payload);
  
    return this.prisma.$transaction(async (prisma) => {
      // Ambil item keranjang berdasarkan userId atau guestId
      console.log('Fetching cart items...');
      const cartItems = await this.cartService.findManyCarts({
        where: userId ? { userId } : { guestId: payload?.metadata?.guestId },
        include: { catalog: true, size: true },
      });
  
      console.log('Cart items fetched:', cartItems);
  
      if (!cartItems || cartItems.length === 0) {
        console.error('Cart is empty.');
        throw new Error('Keranjang belanja kosong.');
      }
  
      // Hitung total harga
      const totalAmount = cartItems.reduce((total, item) => {
        const price = parseFloat(
          item.size.price.replace('Rp', '').replace(/,/g, '').trim(),
        );
        console.log(`Calculating price for item ${item.id}:`, price);
        return total + price * item.quantity;
      }, 0);
  
      console.log('Total amount calculated:', totalAmount);
  
      // Buat payload untuk Midtrans
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
  
      console.log('Midtrans payload created:', midtransPayload);
  
      try {
        // Kirim payload ke Midtrans Snap API
        console.log('Sending transaction request to Midtrans...');
        const transaction = await this.snap.createTransaction(midtransPayload);
        console.log('Midtrans transaction response:', transaction);
  
        // Simpan invoice ke database
        console.log('Saving invoice to database...');
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
  
        console.log('Invoice saved successfully:', savedInvoice);
  
        // Hapus item dari keranjang dan kurangi qty di catalog
        console.log('Clearing cart items and deducting quantities...');
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
  
        console.log('Cart cleared and quantities deducted successfully.');
  
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
      console.log('Webhook payload received:', webhookPayload);
      console.log('X-Callback-Signature received:', signature);
  
      try {
        const transactionStatus = webhookPayload.transaction_status;
        const orderId = webhookPayload.order_id;
        const grossAmount = parseFloat(webhookPayload.gross_amount);
  
        console.log('Processing webhook for order ID:', orderId);
  
        // Validasi signature
        const serverKey = this.configService.get<string>('MIDTRANS_SERVER_KEY');
        if (!serverKey) {
          throw new Error('Server key not found in configuration.');
        }
  
        const isValidSignature = this.validateWebhookSignature(
          webhookPayload,
          signature,
          serverKey,
        );
  
        if (!isValidSignature) {
          console.error('Invalid webhook signature.');
          throw new Error('Invalid webhook signature.');
        }
  
        console.log('Webhook signature validated successfully.');
  
        // Cari invoice yang sesuai
        console.log('Fetching invoice for order ID:', orderId);
        const invoice = await this.prisma.invoice.findUnique({
          where: { midtransOrderId: orderId },
          include: { payment: true },
        });
  
        if (!invoice) {
          console.error(`Invoice with order ID ${orderId} not found.`);
          throw new Error(`Invoice with order ID ${orderId} not found`);
        }
  
        console.log('Invoice found:', invoice);
  
        // Jika payment belum ada, buat dulu
        if (!invoice.payment) {
          console.log('Creating new payment record...');
          const payment = await this.prisma.payment.create({
            data: {
              amount: grossAmount,
              status:
                transactionStatus === 'settlement' ? 'SETTLEMENT' : 'PENDING',
              midtransPaymentId: webhookPayload.transaction_id,
              paymentMethod: webhookPayload.payment_type || 'MIDTRANS',
              user: invoice.userId
                ? {
                    connect: { id: invoice.userId },
                  }
                : undefined,
            },
          });
  
          console.log('Payment created:', payment);
  
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
  
          console.log('Invoice updated with new payment.');
        } else {
          // Jika payment sudah ada, update saja
          console.log('Updating existing payment record...');
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
  
          console.log('Existing payment updated successfully.');
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
      console.log('Expected signature:', expectedSignature);
      console.log('Received signature:', signature);
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