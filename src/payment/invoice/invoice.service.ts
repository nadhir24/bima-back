import {
  Injectable,
  Inject,
  forwardRef,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'prisma/prisma.service';
import { CartService } from 'src/cart/cart.service';
import Xendit from 'xendit-node';

@Injectable()
export class InvoiceService {
  private readonly xenditInstance: any;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    @Inject(forwardRef(() => CartService)) // Inject CartService menggunakan forwardRef
    private readonly cartService: CartService, // ✅ Pastikan parameter ini benar
  ) {
    this.xenditInstance = new Xendit({
      secretKey: this.configService.get<string>('XENDIT_SECRET_KEY'),
    });
  }
  async handleInvoicePaidWebhook(webhookPayload: any): Promise<any> {
    console.log('Invoice Paid Webhook diterima:', webhookPayload);

    const invoices = this.xenditInstance.Invoices;
    const xenditInvoiceId = webhookPayload.id; // Asumsi 'id' adalah xendit Invoice ID, VERIFIKASI DOKUMENTASI!

    try {
      // 1. Dapatkan detail Invoice terbaru dari Xendit API
      const invoiceXendit = await invoices.getInvoice(xenditInvoiceId);

      // 2. Update status Invoice di database lokal
      await this.prisma.invoice.update({
        where: { xenditInvoiceId: xenditInvoiceId },
        data: { status: invoiceXendit.status }, // Update status berdasarkan data dari Xendit
      });

      // 3. Tambahkan logika bisnis lain setelah Invoice paid (opsional)
      // Contoh: Update status order terkait, kirim notifikasi ke user, dll.
      console.log(
        `Invoice ${xenditInvoiceId} status updated to paid in database.`,
      );

      return {
        message: 'Invoice Paid Webhook processed successfully',
        status: 'updated',
      };
    } catch (error) {
      console.error('Error handling Invoice Paid Webhook:', error);
      throw new Error('Gagal memproses Invoice Paid Webhook.');
    }
  }

  async createInvoice(userId: number, payload: any): Promise<any> {
    // ✅ Tambahkan userId parameter
    const invoices = this.xenditInstance.Invoices;

    return this.prisma.$transaction(async (prisma) => {
      // Gunakan Prisma Transaction

      // 1. Ambil item keranjang belanja user
      const cartItems = await this.cartService.findManyCarts({
        where: { userId: userId }, // Ambil cart items berdasarkan userId
        include: { catalog: true, size: true }, // Include catalog dan size
      });

      if (!cartItems || cartItems.length === 0) {
        throw new BadRequestException('Keranjang belanja kosong.');
      }

      // 2. Validasi stok katalog untuk semua item di keranjang belanja
      for (const cartItem of cartItems) {
        if (cartItem.catalog.qty < cartItem.quantity) {
          throw new BadRequestException(
            `Stok tidak cukup untuk produk ${cartItem.catalog.name}. Stok tersedia: ${cartItem.catalog.qty}, Jumlah di keranjang: ${cartItem.quantity}`,
          );
        }
      }

      // 3. Kurangi stok katalog untuk semua item di keranjang belanja
      for (const cartItem of cartItems) {
        await prisma.catalog.update({
          where: { id: cartItem.catalog.id },
          data: { qty: { decrement: cartItem.quantity } },
        });
      }

      try {
        // 4. Buat Invoice Xendit (pindahkan setelah validasi dan pengurangan stok)
        const createdInvoice = await invoices.create({
          ...payload, // Gunakan payload yang diterima dari Controller
          items: cartItems.map((item) => ({
            // Format items untuk Xendit Invoice dari cartItems
            name: item.catalog.name,
            quantity: item.quantity,
            price: parseFloat(
              item.size.price.replace('Rp', '').replace(/,/g, '').trim(),
            ),
            currency: 'IDR', // Hardcode currency IDR, atau sesuaikan jika ada setting currency
            // Kategori dan URL gambar bisa ditambahkan jika ada di model Catalog dan diperlukan di Invoice Xendit
          })),
        });

        // 5. Simpan data Invoice ke database lokal (setelah berhasil buat Invoice Xendit)
        const savedInvoice = await prisma.invoice.create({
          data: {
            xenditInvoiceId: createdInvoice.id,
            status: createdInvoice.status,
            amount: createdInvoice.amount,
            currency: createdInvoice.currency,
            invoiceUrl: createdInvoice.invoice_url,
            userId: userId, // Simpan userId yang membuat invoice
            items: {
              // Simpan detail items invoice di database lokal
              createMany: {
                data: cartItems.map((item: any) => ({
                  name: item.catalog.name,
                  quantity: item.quantity,
                  price: parseFloat(
                    item.size.price.replace('Rp', '').replace(/,/g, '').trim(),
                  ),
                  currency: 'IDR', // Hardcode currency IDR, atau sesuaikan jika ada setting currency
                })),
              },
            },
          },
          include: {
            items: true,
          },
        });

        // 6. Kosongkan keranjang belanja user setelah invoice berhasil dibuat dan stok dikurangi
        await this.cartService.removeManyCarts({ where: { userId: userId } });

        return savedInvoice;
      } catch (error) {
        console.error('Error creating invoice or updating stock:', error);
        // Jika error saat buat invoice Xendit ATAU update stok, transaction akan otomatis rollback
        throw new InternalServerErrorException(
          'Gagal membuat invoice Xendit dan mengurangi stok. Transaksi dibatalkan.',
        );
      }
    });
  }

  async getInvoiceById(invoiceId: string): Promise<any> {
    const invoices = this.xenditInstance.Invoices;

    try {
      const invoiceXendit = await invoices.getById(invoiceId);

      await this.prisma.invoice.update({
        where: { xenditInvoiceId: invoiceId },
        data: { status: invoiceXendit.status },
      });

      const invoiceDB = await this.prisma.invoice.findUnique({
        where: { xenditInvoiceId: invoiceId },
        include: {
          items: true,
        },
      });
      return invoiceDB;
    } catch (error) {
      console.error('Error getting invoice by ID:', error);
      throw new Error('Gagal mendapatkan invoice.');
    }
  }

  async listInvoices(queryParams?: any): Promise<any[]> {
    const invoices = this.xenditInstance.Invoices;

    try {
      const invoiceListXendit = await invoices.list(queryParams);
      return invoiceListXendit.data;
    } catch (error) {
      console.error('Error listing invoices:', error);
      throw new Error('Gagal mendapatkan daftar invoice.');
    }
  }

  async cancelInvoice(invoiceId: string): Promise<any> {
    const invoices = this.xenditInstance.Invoices;

    try {
      const cancelledInvoiceXendit = await invoices.expire(invoiceId);

      await this.prisma.invoice.update({
        where: { xenditInvoiceId: invoiceId },
        data: { status: cancelledInvoiceXendit.status },
      });

      const invoiceDB = await this.prisma.invoice.findUnique({
        where: { xenditInvoiceId: invoiceId },
        include: {
          items: true,
        },
      });
      return invoiceDB;
    } catch (error) {
      console.error('Error cancelling invoice:', error);
      throw new Error('Gagal membatalkan invoice.');
    }
  }
}
