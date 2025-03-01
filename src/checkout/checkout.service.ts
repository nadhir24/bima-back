import { Injectable, BadRequestException, Inject } from '@nestjs/common'; // ✅ Import Inject
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { XenditService } from '../xendit/xendit.service';
import { CartService } from '../cart/cart.service'; // ✅ Import CartService

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly xenditService: XenditService,
    @Inject(CartService) private readonly cartService: CartService, // ✅ Inject CartService
  ) {}

  async createPaymentRequest(createCheckoutDto: CreateCheckoutDto) {
    // 1. Validasi DTO (sudah otomatis dengan ValidationPipe di controller)

    // 2. Ambil Item Keranjang dari Database
    let cartItems;
    if (createCheckoutDto.guestId) {
      cartItems = await this.prisma.cart.findMany({
        where: { guestId: createCheckoutDto.guestId },
        include: { catalog: { include: { sizes: true } }, size: true },
      });
    } else if (createCheckoutDto.userId) {
      cartItems = await this.prisma.cart.findMany({
        where: { userId: createCheckoutDto.userId },
        include: { catalog: { include: { sizes: true } }, size: true },
      });
    } else {
      throw new BadRequestException('Guest ID atau User ID harus disertakan');
    }

    if (!cartItems || cartItems.length === 0) {
      throw new BadRequestException('Keranjang belanja kosong');
    }

    // 3. Hitung Total Harga Pesanan
    // ✅ PANGGIL cartService.getCartTotal() UNTUK MENDAPATKAN TOTAL HARGA (NUMBER)
    const totalAmount = await this.cartService.getCartTotal(
      createCheckoutDto.userId,
      createCheckoutDto.guestId,
    );

    if (isNaN(totalAmount) || totalAmount <= 0) {
      console.error(
        'Error: Total amount tidak valid (dari CartService):',
        totalAmount,
      );
      throw new BadRequestException('Total harga pesanan tidak valid.');
    }

    // 4. Buat Payment Request Xendit
    const xenditPayload = {
      externalID: `order-${Date.now()}-${Math.random() * 1000}`,
      amount: totalAmount, // ✅ GUNAKAN totalAmount YANG DIDAPAT DARI cartService.getCartTotal()
      currency: 'IDR',
      paymentMethods: [
        'EWALLET',
        'CREDIT_CARD',
        'BANK_TRANSFER',
        'RETAIL_OUTLET',
      ],
      successRedirectURL: 'YOUR_SUCCESS_REDIRECT_URL',
      failureRedirectURL: 'YOUR_FAILURE_REDIRECT_URL',
      customer: createCheckoutDto.guestId
        ? {
            given_names: createCheckoutDto.guestName,
            email: createCheckoutDto.guestEmail,
          }
        : {
            given_names: 'User Terdaftar',
            email: createCheckoutDto.userEmail,
          },
      items: cartItems.map((item) => {
        // 🚨 VALIDASI NULL CHECK SEBELUM PARSING HARGA!
        if (
          !item.size ||
          item.size.price === null ||
          item.size.price === undefined
        ) {
          console.error(
            'Error: Harga tidak ditemukan untuk item (di items payload):',
            item,
          );
          throw new BadRequestException(
            'Harga produk tidak valid. Hubungi admin.',
          ); // Atau pesan error lain yang sesuai
        }
        // ✅ PARSING HARGA DENGAN REPLACE FORMAT RUPIAH DAN KOMA, LALU PARSE FLOAT
        const priceString = item.size.price.toString().replace(/Rp|,/g, ''); // Konversi ke string dulu untuk replace
        const price = parseFloat(priceString);
        if (isNaN(price)) {
          console.error(
            'Error: Harga tidak valid (parse NaN) untuk item (di items payload):',
            item,
            'Harga String:',
            item.size.price,
          );
          throw new BadRequestException(
            'Harga produk tidak valid. Hubungi admin.',
          ); // Atau pesan error lain yang sesuai
        }
        return {
          name: item.catalog.name + ' - ' + item.size.size,
          quantity: item.quantity,
          price: price, // ✅ PRICE YANG SUDAH DIPARSE JADI NUMBER (FLOAT)
          currency: 'IDR',
        };
      }),
    };

    // Cetak Payload (untuk debugging, sudah ditambahkan sebelumnya)
    console.log('PAYLOAD YANG DIKIRIM KE XENDIT API:');
    console.log(JSON.stringify(xenditPayload, null, 2));

    const paymentRequest =
      await this.xenditService.createPaymentRequest(xenditPayload);

    // 5. Simpan Payment Request ke Database
    const savedPaymentRequest = await this.prisma.paymentRequest.create({
      data: {
        xenditPaymentRequestId: paymentRequest.id,
        externalId: xenditPayload.externalID,
        status: paymentRequest.status,
        amount: totalAmount,
        currency: xenditPayload.currency,
        paymentRequestUrl: paymentRequest.payment_url,
        paymentMethodCategory: 'PAY_REQUEST',
        paymentMethod: 'MULTIPLE',
        // Hubungkan ke User atau Guest (sesuai logic guest/user di cart) - perlu disesuaikan logic relasi ke User/Guest jika ada
      },
    });

    // 6. Kosongkan Keranjang Belanja (Guest atau User)
    if (createCheckoutDto.guestId) {
      await this.prisma.cart.deleteMany({
        where: { guestId: createCheckoutDto.guestId },
      });
    } else if (createCheckoutDto.userId) {
      await this.prisma.cart.deleteMany({
        where: { userId: createCheckoutDto.userId },
      });
    }

    return { paymentRequestUrl: paymentRequest.payment_url };
  }
}
