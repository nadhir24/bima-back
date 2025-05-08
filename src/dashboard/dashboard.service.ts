import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary() {
    try {
      const [
        totalSalesData,
        totalUsers,
        totalProducts,
        recentSalesData,
        recentOrdersData,
      ] = await Promise.all([
        // 1. Total Sales (Status Settlement)
        this.prisma.payment.aggregate({
          _sum: {
            amount: true,
          },
          where: {
            status: 'SETTLEMENT',
          },
        }),
        // 2. Total Users
        this.prisma.user.count(),
        // 3. Total Products (Enabled)
        this.prisma.catalog.count(),
        // 4. Recent Sales (5 Terbaru, Status Settlement)
        this.prisma.invoice.findMany({
          where: {
            status: 'SETTLEMENT'
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5,
          select: {
            id: true,
            amount: true,
            createdAt: true,
            user: {
              select: {
                fullName: true
              }
            }
          }
        }),
        // 5. Recent Orders (Items from 5 most recent invoices)
        this.prisma.$transaction(async (tx) => {
          const invoiceItems = await tx.invoiceItem.findMany({
            orderBy: {
              invoice: {
                createdAt: 'desc'
              }
            },
            take: 5, // Limit to 5 most recent items
            include: {
              invoice: {
                include: {
                  user: true
                }
              }
            }
          });

          // Get size details for each invoice item
          const itemsWithSizes = await Promise.all(
            invoiceItems.map(async (item) => {
              let sizeInfo = null;
              if (item.sizeId) {
                sizeInfo = await tx.size.findUnique({
                  where: { id: item.sizeId },
                  select: { size: true }
                });
              }
              return {
                ...item,
                sizeInfo
              };
            })
          );
          
          return itemsWithSizes;
        }),
      ]);

      // Format hasil
      const totalSales = Number(totalSalesData._sum.amount) || 0;

      const recentSales = recentSalesData ? recentSalesData.map(sale => ({
        ...sale,
        amount: Number(sale.amount) || 0,
      })) : [];

      const recentOrders = recentOrdersData ? recentOrdersData.map(item => ({
        id: item.id,
        invoiceId: item.invoiceId,
        invoiceStatus: item.invoice.status,
        userName: item.invoice.user?.fullName || 'Anonymous User',
        productName: item.name,
        quantity: item.quantity,
        price: Number(item.price) || 0,
        date: item.invoice.createdAt,
        sizeId: item.sizeId || 0,
        sizeLabel: item.sizeInfo?.size || ''
      })) : [];

      return {
        totalSales,
        totalUsers,
        totalProducts,
        recentSales,
        recentOrders,
      };
    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
      throw new InternalServerErrorException('Could not fetch dashboard summary data.');
    }
  }
} 