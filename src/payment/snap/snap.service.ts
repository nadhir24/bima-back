import {
  Injectable,
  Inject,
  forwardRef,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'prisma/prisma.service';
import { Snap } from 'midtrans-client';
import { CartService } from 'src/cart/cart.service';
import * as crypto from 'crypto';
import { CatalogService } from 'src/catalog/catalog.service';
import axios from 'axios';
import {
  User,
  Address,
  InvoiceItem,
  Cart,
  Catalog,
  Size,
} from '@prisma/client';

type CartWithRelations = Cart & {
  catalog: Catalog;
  size: Size;
};

@Injectable()
export class SnapService {
  private readonly logger = new Logger(SnapService.name);
  private snap: Snap;
  private readonly midtransApiUrl: string;
  private readonly midtransIrisUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    @Inject(forwardRef(() => CartService))
    private cartService: CartService,
    @Inject(forwardRef(() => CatalogService))
    private catalogService: CatalogService,
  ) {
    const serverKey = this.configService.get<string>('MIDTRANS_SERVER_KEY');
    this.midtransApiUrl = this.configService.get<string>('MIDTRANS_API_URL');
    this.midtransIrisUrl = this.configService.get<string>('MIDTRANS_IRIS_URL');

    if (!serverKey) {
      this.logger.error('MIDTRANS_SERVER_KEY is not configured');
      throw new Error(
        'Server key Midtrans tidak ditemukan. Periksa konfigurasi.',
      );
    }

    if (!this.midtransApiUrl) {
      this.logger.error('MIDTRANS_API_URL is not configured');
      throw new Error('Midtrans API URL tidak ditemukan. Periksa konfigurasi.');
    }

    if (!this.midtransIrisUrl) {
      this.logger.error('MIDTRANS_IRIS_URL is not configured');
      throw new Error(
        'Midtrans IRIS URL tidak ditemukan. Periksa konfigurasi.',
      );
    }

    this.logger.log(
      `Initialized with Midtrans API URL: ${this.midtransApiUrl}`,
    );
    this.logger.log(
      `Initialized with Midtrans IRIS URL: ${this.midtransIrisUrl}`,
    );

    this.snap = new Snap({
      isProduction: this.configService.get<string>('MIDTRANS_IS_PRODUCTION') === 'true',
      serverKey: serverKey,
      clientKey: this.configService.get<string>('MIDTRANS_CLIENT_KEY'),
    });

    this.logger.log('Snap service initialized');
  }

  async createTransaction(
    userId: number | null,
    guestId: string | null,
    payload: any,
    shippingAddress: any,
  ): Promise<any> {
    this.logger.log(
      `🔄 Starting transaction creation. UserID: ${userId}, GuestID: ${guestId}`,
    );
    this.logger.log(
      '🕵️ Received Shipping Address in Service:',
      JSON.stringify(shippingAddress, null, 2),
    );

    if (!userId && !guestId) {
      throw new BadRequestException(
        'User ID or Guest ID is required to create a transaction.',
      );
    }

    this.logger.debug('Incoming Payload:', JSON.stringify(payload, null, 2));
    this.logger.debug(
      'Incoming Shipping Address:',
      JSON.stringify(shippingAddress, null, 2),
    );

    return this.prisma.$transaction(
      async (prisma) => {
        this.logger.log('📦 --- Inside Prisma Transaction --- 📦');

          // 1. Fetch Cart Items using correct identifier
        const cartWhereClause = userId ? { userId } : { guestId };
        this.logger.log(
          `🛒 Fetching cart items with WHERE: ${JSON.stringify(cartWhereClause)}`,
        );
        const cartItems = await this.cartService.findManyCarts({
          where: cartWhereClause,
          include: { catalog: true, size: true },
        });
        this.logger.log(`🛒 Found ${cartItems.length} cart items.`);

        if (!cartItems || cartItems.length === 0) {
          this.logger.error('❌ Cart is empty, aborting transaction.');
          throw new BadRequestException(
            'Keranjang belanja kosong. Tidak dapat melanjutkan checkout.',
          );
        }

        // 2. Calculate Total Amount (Keep existing logic)
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
        this.logger.log(`💰 Calculated Total Amount: ${totalAmount}`);

        // 3. Prepare Midtrans Payload (Keep existing logic, ensure customer details use payload/shippingAddress)
        const itemDetails = cartItems.map((item) => {
          const price = parseFloat(
            item.size.price
              .replace('Rp', '')
              .replace(/\./g, '')
              .replace(/,/g, '')
              .trim(),
          );
          return {
            id: item.catalogId?.toString() || `ITEM-${item.id}`,
            price: price,
            quantity: item.quantity,
            name: item.catalog.name,
          };
        });

        // Extract user details primarily from the payload for consistency
        const customerFirstName =
          shippingAddress?.firstName || payload?.user?.firstName || 'Guest';
        const customerLastName =
          shippingAddress?.lastName ||
          payload?.user?.lastName ||
          (userId ? 'User' : ''); // Empty last name for guest if not provided
        const customerEmail =
          shippingAddress?.email || payload?.user?.email || 'guest@example.com'; // Consider a more robust guest email strategy if needed
        const customerPhone =
          shippingAddress?.phone || payload?.user?.phoneNumber || '08000000000'; // Ensure valid default/fallback

        const midtransPayload = {
          transaction_details: {
            order_id: `order-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`, // Use crypto for better uniqueness
            gross_amount: totalAmount,
          },
          credit_card: { secure: true },
          customer_details: {
            first_name: customerFirstName,
            last_name: customerLastName,
            email: customerEmail,
            phone: customerPhone, // Use extracted phone
            // Shipping address uses data passed directly
            shipping_address: shippingAddress
              ? {
                  first_name: shippingAddress.firstName || customerFirstName, // Fallback to billing name
                  last_name: shippingAddress.lastName || customerLastName,
                  email: shippingAddress.email || customerEmail,
                  phone: shippingAddress.phone || customerPhone,
                  address: shippingAddress.address,
                  city: shippingAddress.city,
                  postal_code: shippingAddress.postalCode,
                  country_code: 'IDN',
                  // Include potentially missing fields if available in shippingAddress
                  ...(shippingAddress.district && {
                    district: shippingAddress.district,
                  }),
                  ...(shippingAddress.province && {
                    province: shippingAddress.province,
                  }),
                }
              : undefined,
          },
          item_details: itemDetails,
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
          expiry: { duration: 30, unit: 'minute' },
        };
        this.logger.log(
          `📦 Prepared Midtrans Payload for Order ID: ${midtransPayload.transaction_details.order_id}`,
        );
        this.logger.debug(
          'Midtrans Payload Details:',
          JSON.stringify(midtransPayload, null, 2),
        );

        // 4. Create Midtrans Transaction (Keep existing logic)
        let transaction;
        try {
          this.logger.log(
            `📤 Sending createTransaction to Midtrans for Order ID: ${midtransPayload.transaction_details.order_id}`,
          );
          transaction = await this.snap.createTransaction(midtransPayload);
          this.logger.log(
            `✅ Midtrans response received for Order ID: ${midtransPayload.transaction_details.order_id}`,
          );
          this.logger.debug('Midtrans Response:', transaction);
        } catch (midtransError) {
          this.logger.error(
            `❌ Midtrans createTransaction failed for Order ID: ${midtransPayload.transaction_details.order_id}`,
            {
              error: midtransError.message,
              status: midtransError.httpStatusCode, // Midtrans specific status
              apiResponse: midtransError.ApiResponse, // Midtrans specific response
              stack: midtransError.stack,
              payloadSent: midtransPayload,
            },
          );
          throw new InternalServerErrorException(
            `Gagal menghubungi Midtrans: ${midtransError.message}`,
          );
        }

        // 5. Prepare Invoice Items Data (Keep existing logic)
        const invoiceItemsData = cartItems.map((item) => {
          const price = parseFloat(
            item.size.price
              .replace('Rp', '')
              .replace(/\./g, '')
              .replace(/,/g, '')
              .trim(),
          );
          return {
            name: item.catalog.name,
            quantity: item.quantity,
            price: price,
            currency: 'IDR',
            catalogId: item.catalogId,
            sizeId: item.sizeId,
          };
        });
        this.logger.log(
          `🧾 Prepared ${invoiceItemsData.length} items for invoice.`,
        );

        // 6. Save Invoice to DB (Include guestId if userId is null)
        this.logger.log(
          `💾 Saving invoice to DB for Order ID: ${midtransPayload.transaction_details.order_id}`,
        );

        // Pastikan userId berupa integer (karena bisa jadi diterima sebagai string)
        let userIdToUse = null;
        if (userId !== null) {
          // Konversi userId ke integer jika string
          userIdToUse =
            typeof userId === 'string' ? parseInt(userId, 10) : userId;

          // Validasi hasil konversi
          if (isNaN(userIdToUse)) {
            this.logger.error(`Invalid userId format: ${userId}`);
            throw new BadRequestException('Format User ID tidak valid');
          }
        }

        const savedInvoice = await prisma.invoice.create({
          data: {
            midtransOrderId: midtransPayload.transaction_details.order_id,
            status: 'PENDING',
            amount: totalAmount,
            currency: 'IDR',
            paymentUrl: transaction.redirect_url,
            // Conditionally connect userId atau set guestId
            ...(userIdToUse
              ? { user: { connect: { id: userIdToUse } } }
              : { guestId: guestId }),
            // Use consistent variable names for shipping details
            shippingFirstName: shippingAddress?.firstName,
            shippingLastName: shippingAddress?.lastName,
            shippingEmail: shippingAddress?.email,
            shippingPhone: shippingAddress?.phone,
            shippingAddress: shippingAddress?.address,
            shippingCity: shippingAddress?.city,
            shippingProvince: shippingAddress?.province,
            shippingPostalCode: shippingAddress?.postalCode,
            shippingCountryCode: 'IDN', // Assuming IDN
            items: {
              createMany: {
                data: invoiceItemsData,
                skipDuplicates: true, // Optional: prevent error if somehow duplicate items are generated
              },
            },
          },
          include: { items: true }, // Include items for logging/return if needed
        });
        this.logger.log(
          `💾 Invoice saved successfully. DB Invoice ID: ${savedInvoice.id}`,
        );

        this.logger.log(`✅ --- Prisma Transaction Complete --- ✅`);

        return {
          paymentLink: transaction.redirect_url,
          invoice: savedInvoice, // Return the saved invoice data
          message: 'Transaksi berhasil dibuat.',
        };
      },
      {
        // Optional: Increase transaction timeout if needed (e.g., 15 seconds)
        timeout: 15000,
      },
    );
  }

  async handleWebhook(webhookPayload: any): Promise<any> {
    try {
      this.logger.log('Received webhook notification from Midtrans');
      this.logger.debug('Webhook payload:', webhookPayload);

      const {
        order_id,
        status_code,
        gross_amount,
        transaction_status,
        transaction_id,
        payment_type,
        signature_key,
      } = webhookPayload;

      this.logger.debug(
        `Processing order ID: ${order_id}, Status: ${transaction_status}`,
      );

      const serverKey = this.configService.get<string>('MIDTRANS_SERVER_KEY');
      if (!serverKey) {
        this.logger.error('MIDTRANS_SERVER_KEY not found in configuration');
        throw new Error('Server key not found in configuration.');
      }

      const isValidSignature = this.validateWebhookSignature(
        webhookPayload,
        signature_key,
        serverKey,
      );

      if (!isValidSignature) {
        this.logger.error('Invalid webhook signature', {
          receivedSignature: signature_key,
          payload: webhookPayload,
        });
        throw new Error('Invalid webhook signature.');
      }

      this.logger.debug('Signature validation successful');

      // Fetch full invoice data needed for Midtrans Invoice API
      this.logger.debug(`Fetching invoice data for order ID: ${order_id}`);
      const invoice = await this.prisma.invoice.findUnique({
        where: { midtransOrderId: order_id },
        include: {
          payment: true,
          items: true,
          user: true,
        },
      });

      if (!invoice) {
        this.logger.error(`Invoice not found for order ID: ${order_id}`);
        throw new Error(`Invoice with order ID ${order_id} not found`);
      }

      this.logger.debug(
        `Found invoice ID: ${invoice.id}, Current status: ${invoice.status}`,
      );

      let updatedInvoice: any = invoice;

      // Handle payment creation or update
      if (!invoice.payment) {
        this.logger.debug('Creating new payment record');
        const payment = await this.prisma.payment.create({
          data: {
            amount: parseFloat(gross_amount),
            status: transaction_status.toUpperCase(),
            midtransPaymentId: transaction_id,
            paymentMethod: payment_type || 'MIDTRANS',
            user: invoice.userId
              ? { connect: { id: invoice.userId } }
              : undefined,
          },
        });

        this.logger.debug(`Payment created with ID: ${payment.id}`);

        updatedInvoice = await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            status: transaction_status.toUpperCase(),
            payment: {
              connect: { id: payment.id },
            },
          },
          include: {
            payment: true,
            items: true,
            user: true,
          },
        });

        this.logger.debug(`Invoice updated with payment ID: ${payment.id}`);
      } else if (invoice.status !== transaction_status) {
        this.logger.debug(
          `Updating existing payment status from ${invoice.status} to ${transaction_status}`,
        );
        // Only update if status changes
        updatedInvoice = await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            status: transaction_status.toUpperCase(),
            payment: {
              update: {
                status:
                  transaction_status === 'settlement'
                    ? 'SETTLEMENT'
                    : transaction_status.toUpperCase(),
                midtransPaymentId: transaction_id,
              },
            },
          },
          include: {
            payment: true,
            items: true,
            user: true,
          },
        });
      }

      // Deduct quantity on settlement
      if (transaction_status === 'settlement') {
        this.logger.debug(
          'Processing settlement: deducting quantities from inventory',
        );

        // Hapus cart jika transaksi berhasil/settlement
        if (updatedInvoice.userId || updatedInvoice.guestId) {
          this.logger.log(
            `🗑️ Clearing cart for ${updatedInvoice.userId ? `User ${updatedInvoice.userId}` : `Guest ${updatedInvoice.guestId}`} after successful payment`,
          );

          const deleteWhereClause = updatedInvoice.userId
            ? { userId: updatedInvoice.userId }
            : { guestId: updatedInvoice.guestId };

          try {
            await this.cartService.removeManyCarts({
              where: deleteWhereClause,
            });
            this.logger.log(
              `🗑️ Cart cleared successfully after payment settlement.`,
            );
          } catch (cartError) {
            this.logger.error(`Failed to clear cart after settlement:`, {
              error: cartError,
              userId: updatedInvoice.userId,
              guestId: updatedInvoice.guestId,
            });
            // Don't throw error, continue with other operations
          }
        }

        // Existing code to deduct quantity
        for (const item of invoice.items) {
          if (!item.catalogId || !item.sizeId) {
            this.logger.debug(
              `Skipping quantity deduction for item: ${item.id}`,
            );
            continue;
          }

          try {
            this.logger.debug(
              `Deducting quantity for item ${item.id}: catalogId=${item.catalogId}, sizeId=${item.sizeId}, qty=${item.quantity}`,
            );
            await this.catalogService.deductQuantity(
              item.catalogId,
              item.sizeId,
              item.quantity,
            );
          } catch (deductionError) {
            this.logger.error(
              `Failed to deduct quantity for item ${item.id}:`,
              {
                error: deductionError,
                item: item,
                invoice: invoice.id,
              },
            );
          }
        }

        // Auto-create Midtrans Invoice on Settlement
        if (!updatedInvoice.midtransInvoiceUrl) {
          this.logger.debug(
            'Creating Midtrans Invoice for settled transaction',
          );
          try {
            const midtransInvoiceOrderId = `MINV-${Date.now() % 1000000}`;

            this.logger.debug('Preparing invoice data', {
              invoiceOrderId: midtransInvoiceOrderId,
              apiUrl: this.midtransApiUrl,
            });

            const midtransInvoiceNumber = `MINV-${updatedInvoice.id}-${Date.now() % 1000000}`;
            const invoiceDate = new Date();

            // Format dates for Midtrans
            const formatDateForMidtrans = (date: Date) => {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const hours = String(date.getHours()).padStart(2, '0');
              const minutes = String(date.getMinutes()).padStart(2, '0');
              const seconds = String(date.getSeconds()).padStart(2, '0');
              return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} +0700`;
            };

            // Helper function for E.164 phone formatting
            const formatPhoneE164 = (
              phone: string | null | undefined,
            ): string => {
              if (!phone) return '628000000000'; // Tanpa tanda +
              let digits = phone.replace(/\D/g, '');
              if (digits.startsWith('0')) {
                digits = '62' + digits.substring(1);
              } else if (digits.startsWith('8')) {
                digits = '62' + digits;
              } else if (digits.startsWith('620')) {
                digits = '62' + digits.substring(3);
              } else if (digits.startsWith('62')) {
                // Sudah format yang benar
              } else if (digits.startsWith('+62')) {
                digits = digits.substring(1); // Hapus tanda +
              }

              // Pastikan tidak mulai dengan + untuk Midtrans
              return digits.startsWith('+') ? digits.substring(1) : digits;
            };

            // Correctly use stored shipping details
            const customerDetails = {
              id:
                updatedInvoice.userId?.toString() ||
                `GUEST-${updatedInvoice.id}`,
              // Use shipping names, fall back to user name if available, then 'Guest'
              name: `${updatedInvoice.shippingFirstName || updatedInvoice.user?.fullName?.split(' ')[0] || 'Guest'} ${updatedInvoice.shippingLastName || updatedInvoice.user?.fullName?.split(' ').slice(1).join(' ') || (updatedInvoice.userId ? 'User' : '')}`.trim(),
              email:
                updatedInvoice.shippingEmail ||
                updatedInvoice.user?.email ||
                'guest@example.com', // Prioritize shipping email
              phone: formatPhoneE164(
                updatedInvoice.shippingPhone ||
                  updatedInvoice.user?.phoneNumber,
              ), // Use formatted phone
            };

            // Remove item_id from item_details
            const itemDetails = updatedInvoice.items.map(
              (item: InvoiceItem) => ({
                // item_id: item.id.toString(), // Removed
                description: item.name,
                quantity: item.quantity,
                price: item.price,
              }),
            );

            // Tambahkan due_date (30 hari dari sekarang)
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30);

            const invoicePayload = {
              order_id: midtransInvoiceOrderId,
              invoice_number: midtransInvoiceNumber,
              invoice_date: formatDateForMidtrans(invoiceDate),
              due_date: formatDateForMidtrans(dueDate), // Midtrans mewajibkan field ini
              customer_details: customerDetails,
              payment_type: 'payment_link',
              item_details: itemDetails,
              // Remove the 'amount' object
              // amount: { total: updatedInvoice.amount, currency: 'IDR' }
            };

            this.logger.debug(
              `Sending invoice payload to Midtrans: ${JSON.stringify(invoicePayload, null, 2)}`,
            );

            const midtransAuth = `Basic ${Buffer.from(serverKey + ':').toString('base64')}`;
            
            this.logger.debug(`Making API call to ${this.midtransApiUrl}/v1/invoices`);
            this.logger.debug(`Using auth header: ${midtransAuth.substring(0, 15)}...`);
            
            try {
              const midtransInvoice = await axios({
                method: 'post',
                url: `${this.midtransApiUrl}/v1/invoices`,
                headers: {
                  'Content-Type': 'application/json',
                  Accept: 'application/json',
                  Authorization: midtransAuth,
                },
                data: invoicePayload,
                timeout: 10000, // 10 seconds timeout
              });
              
              this.logger.debug(`✅ Midtrans API response success:`, {
                status: midtransInvoice.status,
                statusText: midtransInvoice.statusText,
              });
              this.logger.debug(`Response data:`, midtransInvoice.data);

              if (midtransInvoice.data && midtransInvoice.data.payment_link_url && midtransInvoice.data.pdf_url) {
                // Update local invoice with Midtrans Invoice details
                updatedInvoice = await this.prisma.invoice.update({
                  where: { id: updatedInvoice.id },
                  data: {
                    midtransInvoiceUrl: midtransInvoice.data.payment_link_url,
                    midtransInvoicePdfUrl: midtransInvoice.data.pdf_url,
                  },
                  include: { payment: true, items: true, user: true },
                });
                this.logger.debug(
                  '✅ Invoice URLs saved to database successfully',
                );
              } else {
                this.logger.error('❌ Midtrans response missing required URLs', midtransInvoice.data);
              }
            } catch (axiosError) {
              this.logger.error('❌ Axios error in Midtrans API call:', {
                message: axiosError.message,
                code: axiosError.code,
                response: axiosError.response?.data,
                status: axiosError.response?.status,
                headers: axiosError.response?.headers,
              });
              throw axiosError;
            }
          } catch (invoiceError) {
            this.logger.error('Failed to create Midtrans Invoice:', {
              orderId: order_id,
              localInvoiceId: updatedInvoice.id,
              message: invoiceError.message,
              status: invoiceError.response?.status, // Log status code
              headers: invoiceError.response?.headers, // Log response headers
              data: invoiceError.response?.data, // Log response data (might contain more details or HTML)
              requestConfig: {
                // Log the request config
                url: invoiceError.config?.url,
                method: invoiceError.config?.method,
                headers: invoiceError.config?.headers,
                data: invoiceError.config?.data, // Log the data that was sent
              },
              stack: invoiceError.stack, // Log stack trace
            });
            // Don't throw error here, just log. Webhook processing should continue.
          }
        }
      }

      this.logger.log(
        `Webhook processed successfully for order ID: ${order_id}`,
      );
      return {
        message: 'Webhook processed successfully',
        status: 'updated',
        orderId: order_id,
        transactionStatus: transaction_status,
      };
    } catch (error) {
      this.logger.error('Error handling webhook:', {
        error: error,
        stack: error.stack,
        message: error.message,
        payload: webhookPayload,
      });

      if (
        error instanceof Error &&
        error.message.includes('Invalid webhook signature')
      ) {
        throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
      } else if (
        error instanceof Error &&
        error.message.includes('not found')
      ) {
        throw new HttpException('Invoice not found', HttpStatus.NOT_FOUND);
      } else {
        throw new HttpException(
          {
            error: 'Webhook Processing Error',
            message: error.message,
            details: error.stack,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  private validateWebhookSignature(
    payload: any,
    signature: string,
    serverKey: string,
  ): boolean {
    const expectedSignature = this.generateSignature(payload, serverKey);
    return expectedSignature === signature;
  }

  private generateSignature(payload: any, secretKey: string): string {
    const stringToSign =
      payload.order_id + payload.status_code + payload.gross_amount + secretKey;
    return crypto.createHash('sha512').update(stringToSign).digest('hex');
  }

  async generateInvoiceManually(orderId: string) {
    try {
      this.logger.log(`🔄 Manual invoice generation requested for order ID: ${orderId}`);
      
      const invoice = await this.prisma.invoice.findUnique({
        where: { midtransOrderId: orderId },
        include: {
          items: true,
          user: true,
        },
      });

      if (!invoice) {
        this.logger.error(`❌ Invoice not found for order ID: ${orderId}`);
        throw new NotFoundException(
          `Invoice with order ID ${orderId} not found`,
        );
      }

      this.logger.log(`📄 Found invoice ID: ${invoice.id}, Status: ${invoice.status}`);
      
      // Only generate for settlement status - check all variations of the status
      if (invoice.status.toUpperCase() !== 'SETTLEMENT') {
        this.logger.error(`❌ Cannot generate invoice for non-settled transaction: ${invoice.status}`);
        throw new BadRequestException(
          'Can only generate invoice for settled transactions',
        );
      }

      // Check if invoice already has URLs
      if (invoice.midtransInvoiceUrl && invoice.midtransInvoicePdfUrl) {
        this.logger.log(`⚠️ Invoice already has URLs, returning existing data`);
        return {
          success: true,
          data: invoice,
          message: 'Invoice already exists',
        };
      }

      // Prepare customer details
      const customerDetails: any = {};
      if (invoice.user) {
        customerDetails.id = invoice.userId.toString();
        customerDetails.name = invoice.user.fullName;
        customerDetails.email = invoice.user.email;
        
        // Format phone number correctly for Midtrans
        let phone = invoice.user.phoneNumber;
        if (phone) {
          phone = phone.replace(/\D/g, '');
          if (phone.startsWith('0')) {
            phone = '62' + phone.substring(1);
          } else if (phone.startsWith('8')) {
            phone = '62' + phone;
          }
          if (phone.startsWith('+')) {
            phone = phone.substring(1);
          }
        }
        customerDetails.phone = phone;
      } else {
        // Handle guest user case
        customerDetails.id = `GUEST-${invoice.id}`;
        customerDetails.name = invoice.shippingFirstName ? 
          `${invoice.shippingFirstName} ${invoice.shippingLastName || ''}`.trim() : 'Guest';
        customerDetails.email = invoice.shippingEmail || 'guest@example.com';
        customerDetails.phone = invoice.shippingPhone ? invoice.shippingPhone.replace(/^\+/, '') : '628000000000';
      }

      // Prepare item details
      const itemDetails = invoice.items
        .filter((item) => item.name !== 'Biaya Pengiriman')
        .map((item) => ({
          description: item.name,
          quantity: item.quantity,
          price: item.price,
        }));

      const shippingItem = invoice.items.find(
        (item) => item.name === 'Biaya Pengiriman',
      );
      const shippingCost = shippingItem ? shippingItem.price : 0;

      // Generate new invoice order ID
      const midtransInvoiceOrderId = `MINV-${Date.now() % 1000000}`;
      const midtransInvoiceNumber = `MINV-${invoice.id}-${Date.now() % 1000000}`;

      const invoiceDate = new Date();

      const formatDateForMidtrans = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} +0700`;
      };

      // Tambahkan due_date (30 hari dari sekarang)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const invoicePayload = {
        order_id: midtransInvoiceOrderId,
        invoice_number: midtransInvoiceNumber,
        invoice_date: formatDateForMidtrans(invoiceDate),
        due_date: formatDateForMidtrans(dueDate), // Midtrans mewajibkan field ini
        customer_details: customerDetails,
        payment_type: 'payment_link',
        item_details: itemDetails,
        amount: {
          shipping: shippingCost,
        },
      };

      // Ensure phone doesn't have leading + character
      if (customerDetails.phone && customerDetails.phone.startsWith('+')) {
        customerDetails.phone = customerDetails.phone.substring(1);
      }

      this.logger.log(`📤 Sending invoice payload to Midtrans: ${JSON.stringify(invoicePayload, null, 2)}`);

      const serverKey = this.configService.get<string>('MIDTRANS_SERVER_KEY');
      if (!serverKey) {
        throw new InternalServerErrorException('Server key not found in configuration');
      }
      
      const midtransAuth = `Basic ${Buffer.from(serverKey + ':').toString('base64')}`;
      
      this.logger.debug(`Making API call to ${this.midtransApiUrl}/v1/invoices`);
      this.logger.debug(`Using auth header: ${midtransAuth.substring(0, 15)}...`);

      try {
        const response = await axios({
          method: 'post',
          url: `${this.midtransApiUrl}/v1/invoices`,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: midtransAuth,
          },
          data: invoicePayload,
          timeout: 15000, // 15 seconds timeout
        });
        
        this.logger.log(`✅ Midtrans response received: Status ${response.status}`);
        this.logger.debug(`Response data:`, response.data);
        
        if (!response.data.payment_link_url || !response.data.pdf_url) {
          this.logger.error('❌ Midtrans response missing required URLs', response.data);
          throw new InternalServerErrorException('Invalid response from Midtrans API - missing URLs');
        }

        // Update invoice with new URLs
        const updatedInvoice = await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            midtransInvoiceUrl: response.data.payment_link_url,
            midtransInvoicePdfUrl: response.data.pdf_url,
          },
          include: {
            items: true,
            user: true,
          },
        });
        
        this.logger.log(`💾 Invoice URLs saved successfully to database`);

        return {
          success: true,
          data: updatedInvoice,
          message: 'Invoice generated successfully',
        };
      } catch (axiosError) {
        this.logger.error('❌ Axios error in Midtrans API call:', {
          message: axiosError.message,
          code: axiosError.code,
          response: axiosError.response?.data,
          status: axiosError.response?.status,
          headers: axiosError.response?.headers,
        });
        throw new InternalServerErrorException(
          `Failed to generate invoice: ${axiosError.message}`,
        );
      }
    } catch (error) {
      this.logger.error('Error generating invoice manually:', {
        error: error.message,
        stack: error.stack,
        orderId,
      });

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to generate invoice. Please try again later.',
      );
    }
  }
}
