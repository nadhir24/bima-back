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
  
      // Add shipping cost
      const shippingCost = 25000; // 25,000 IDR
      const totalAmountWithShipping = totalAmount + shippingCost;
      const formattedTotalAmount = Number(totalAmountWithShipping).toFixed(2);
  
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
        item_details: [
          ...cartItems.map((item) => ({
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
          {
            id: 'shipping-fee',
            price: shippingCost,
            quantity: 1,
            name: 'Biaya Pengiriman',
          },
        ],
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
        
       // Before creating invoice items
const invoiceItemsData = cartItems.map((item) => ({
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
  catalogId: item.catalogId,  
  sizeId: item.sizeId,        
}));
        
        // Add shipping item to invoice items
        invoiceItemsData.push({
          name: 'Biaya Pengiriman',
          quantity: 1,
          price: shippingCost,
          currency: 'IDR',
          catalogId: null,  // Not applicable for shipping
          sizeId: null,     // Not applicable for shipping
        });
  
        const savedInvoice = await prisma.invoice.create({
          data: {
            midtransOrderId: midtransPayload.transaction_details.order_id,
            status: 'PENDING',
            amount: totalAmountWithShipping,
            currency: 'IDR',
            paymentUrl: transaction.redirect_url,
            userId: userId || null,
            items: {
              createMany: {
                data: invoiceItemsData,
              },
            },
          },
          include: { items: true },
        });
  
        // Don't deduct quantity here, move to webhook when payment is settled
        // Instead just clear the cart
        await this.cartService.removeManyCarts({
          where: userId ? { userId } : { guestId: payload?.metadata?.guestId },
        });
  
        return {
          paymentLink: transaction.redirect_url,
          invoice: savedInvoice,
          message: 'Transaksi berhasil dibuat. Arahkan user ke link ini untuk menyelesaikan pembayaran.',
        };
      } catch (error) {
        console.error('Error creating transaction with Snap API:', error);
        throw new Error('Gagal membuat transaksi Midtrans. Transaksi dibatalkan.');
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
        include: { payment: true, items: true },
      });
  
      if (!invoice) {
        console.error(`❌ Invoice with order ID ${order_id} not found.`);
        throw new Error(`Invoice with order ID ${order_id} not found`);
      }
  
      // Handle payment creation or update
      if (!invoice.payment) {
        const payment = await this.prisma.payment.create({
          data: {
            amount: parseFloat(gross_amount),
            status: transaction_status.toUpperCase(), // could be SETTLEMENT, EXPIRE, CANCEL, etc.
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
                status: transaction_status === 'settlement' ? 'SETTLEMENT' : transaction_status.toUpperCase(),
                midtransPaymentId: transaction_id,
              },
            },
          },
        });
      }
  
     // In your handleWebhook function
if (transaction_status === 'settlement') {
  for (const item of invoice.items) {
    // Skip shipping fee item
    if (item.name === 'Biaya Pengiriman' || 
        !(item as any).catalogId || 
        !(item as any).sizeId) {
      continue;
    }
    
    await this.catalogService.deductQuantity(
      (item as any).catalogId,
      (item as any).sizeId,
      item.quantity,
    );
  }
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
