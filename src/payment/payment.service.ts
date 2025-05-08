import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(private prisma: PrismaService) {}

  // Run every hour to clean up expired pending invoices
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupPendingInvoices() {
    try {
      this.logger.log('Starting scheduled cleanup of pending invoices');
      
      // Calculate the timestamp for 24 hours ago
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      
      // First, find invoices that are still PENDING after 24 hours
      const pendingInvoices = await this.prisma.invoice.findMany({
        where: {
          status: 'PENDING',
          createdAt: {
            lt: twentyFourHoursAgo,
          },
        },
        select: {
          id: true,
        },
      });
      
      if (pendingInvoices.length === 0) {
        this.logger.log('No expired PENDING invoices found');
        return {
          success: true,
          deletedCount: 0,
        };
      }
      
      // Get the IDs of invoices to delete
      const invoiceIds = pendingInvoices.map(invoice => invoice.id);
      this.logger.log(`Found ${invoiceIds.length} expired PENDING invoices to delete: ${invoiceIds.join(', ')}`);
      
      // First delete the invoice items due to foreign key constraint
      const deletedItems = await this.prisma.invoiceItem.deleteMany({
        where: {
          invoiceId: {
            in: invoiceIds
          },
        },
      });
      
      this.logger.log(`Deleted ${deletedItems.count} invoice items from expired invoices`);
      
      // Then delete the invoices
      const result = await this.prisma.invoice.deleteMany({
        where: {
          id: {
            in: invoiceIds
          },
        },
      });
      
      this.logger.log(`Successfully deleted ${result.count} expired PENDING invoices`);
      return {
        success: true,
        deletedCount: result.count,
        deletedItemsCount: deletedItems.count,
      };
    } catch (error) {
      this.logger.error('Error cleaning up pending invoices', error);
      return {
        success: false,
        message: 'Failed to clean up pending invoices',
        error: error.message,
      };
    }
  }

  async getInvoiceNotifications(userId: number) {
    try {
      this.logger.log(`Fetching invoice notifications for user ${userId}`);

      // Ambil invoice untuk user yang statusnya masih pending
      const invoices = await this.prisma.invoice.findMany({
        where: {
          userId: userId,
          status: 'PENDING', // Hanya ambil yang pending
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          items: true,
        },
      });

      // Format data untuk frontend
      const notifications = invoices.map((invoice) => ({
        id: invoice.id,
        invoice_number: invoice.midtransOrderId || `INV-${invoice.id}`,
        amount: invoice.amount,
        status: invoice.status.toLowerCase(),
        created_at: invoice.createdAt,
        payment_url: invoice.paymentUrl,
      }));

      return {
        success: true,
        data: notifications,
      };
    } catch (error) {
      this.logger.error('Error fetching invoice notifications', error);
      return {
        success: false,
        message: 'Gagal mengambil notifikasi invoice',
        error: error.message,
      };
    }
  }

  async getUserInvoices(userId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { items: true },
      }),
      this.prisma.invoice.count({ where: { userId } }),
    ]);
    return {
      data,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        hasNextPage: skip + data.length < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getGuestInvoices(guestId: string, page: number, limit: number) {
    try {
      this.logger.log(`Fetching invoices for guest ID: ${guestId}`);
      
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.invoice.findMany({
          where: { guestId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: { items: true },
        }),
        this.prisma.invoice.count({ where: { guestId } }),
      ]);
      
      return {
        data,
        pagination: {
          totalItems: total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          hasNextPage: skip + data.length < total,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      this.logger.error(`Error fetching invoices for guest ID: ${guestId}`, error);
      return {
        success: false,
        message: 'Failed to retrieve guest invoice data',
        error: error.message,
      };
    }
  }

  async getAllInvoices(page: number, limit: number, search?: string, status?: string, startDate?: string, endDate?: string) {
    try {
      this.logger.log(`Fetching all invoices for admin (page ${page}, limit ${limit}, search: ${search || 'none'}, status: ${status || 'all'}, date range: ${startDate || 'none'} to ${endDate || 'none'})`);
      
      const skip = (page - 1) * limit;
      
      // Build where clause
      const where: any = {};
      
      // Add status filter if provided
      if (status && status !== 'all') {
        where.status = status;
      }
      
      // Add date range filter if both dates provided
      if (startDate && endDate) {
        where.createdAt = {
          gte: new Date(startDate),
          lte: new Date(`${endDate}T23:59:59.999Z`), // End of the day
        };
      }
      
      // Add search filter for user name, email, or order ID
      if (search && search.trim() !== '') {
        where.OR = [
          { midtransOrderId: { contains: search, mode: 'insensitive' } },
          { 
            user: { 
              OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
              ]
            } 
          },
          {
            items: {
              some: {
                name: { contains: search, mode: 'insensitive' }
              }
            }
          }
        ];
      }
      
      const [data, total] = await Promise.all([
        this.prisma.invoice.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: { 
            items: true,
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phoneNumber: true
              }
            }
          },
        }),
        this.prisma.invoice.count({ where }),
      ]);
      
      return {
        data,
        pagination: {
          totalItems: total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          hasNextPage: skip + data.length < total,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching all invoices for admin', error);
      return {
        success: false,
        message: 'Failed to retrieve invoice data',
        error: error.message,
      };
    }
  }
}
