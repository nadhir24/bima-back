import {
  Injectable,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllProducts(query: { page?: number; limit?: number }) {
    try {
      const page = query.page ? Number(query.page) : 1;
      const limit = query.limit ? Number(query.limit) : 10;
      const skip = (page - 1) * limit;

      const [products, totalCount] = await Promise.all([
        this.prisma.catalog.findMany({
          skip,
          take: limit,
          include: {
            sizes: {
              select: {
                id: true,
                size: true,
                price: true,
                qty: true,
                catalogId: true,
              },
            },
          },
        }),
        this.prisma.catalog.count(),
      ]);

      const transformedProducts = products.map((product) => ({
        ...product,
        sizes: product.sizes.map((size) => ({
          ...size,
          price: parseFloat(size.price.replace(/[^0-9]/g, '')),
        })),
      }));

      return {
        products: transformedProducts,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve products from database.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAllOrders(query: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const whereConditions: any = {};

    if (query.status && query.status !== 'all') {
      whereConditions.status = query.status;
    }

    if (query.startDate || query.endDate) {
      whereConditions.createdAt = {};

      if (query.startDate) {
        whereConditions.createdAt.gte = new Date(query.startDate);
      }

      if (query.endDate) {
        const endDate = new Date(query.endDate);
        endDate.setHours(23, 59, 59, 999);
        whereConditions.createdAt.lte = endDate;
      }
    }

    if (query.search) {
      whereConditions.OR = [
        {
          midtransOrderId: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          user: {
            fullName: {
              contains: query.search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    const [orders, totalCount] = await Promise.all([
      this.prisma.invoice.findMany({
        where: whereConditions,
        skip,
        take: limit,
        include: {
          user: true,
          payment: true,
          items: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.invoice.count({
        where: whereConditions,
      }),
    ]);

    const allSizeIds = orders
      .flatMap((order) => order.items)
      .filter((item) => item.sizeId)
      .map((item) => item.sizeId);

    let sizes = [];
    if (allSizeIds.length > 0) {
      sizes = await this.prisma.size.findMany({
        where: {
          id: {
            in: allSizeIds.filter(
              (id) => id !== null && id !== undefined,
            ) as number[],
          },
        },
      });
    }

    const sizeMap = new Map(sizes.map((size) => [size.id, size]));

    const ordersWithSizeInfo = orders.map((order) => ({
      ...order,
      items: order.items.map((item) => ({
        ...item,
        sizeInfo: item.sizeId ? sizeMap.get(item.sizeId) : null,
      })),
    }));

    return {
      orders: ordersWithSizeInfo,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    };
  }

  async getOrderById(orderId: number) {
    try {
      const order = await this.prisma.invoice.findUnique({
        where: {
          id: orderId,
        },
        include: {
          user: true,
          payment: true,
          items: true,
        },
      });

      if (!order) {
        throw new NotFoundException(
          `Order dengan ID ${orderId} tidak ditemukan`,
        );
      }

      const sizeIds = order.items
        .filter((item) => item.sizeId)
        .map((item) => item.sizeId);

      let sizeMap = new Map();
      if (sizeIds.length > 0) {
        const sizes = await this.prisma.size.findMany({
          where: {
            id: {
              in: sizeIds.filter(
                (id) => id !== null && id !== undefined,
              ) as number[],
            },
          },
        });

        sizeMap = new Map(sizes.map((size) => [size.id, size]));
      }

      const orderWithSizeInfo = {
        ...order,
        items: order.items.map((item) => ({
          ...item,
          sizeInfo: item.sizeId ? sizeMap.get(item.sizeId) : null,
        })),
      };

      return orderWithSizeInfo;
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve order details',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateOrderStatus(orderId: number, status: string) {
    const updatedOrder = await this.prisma.invoice.update({
      where: { id: orderId },
      data: { status: status },
      include: {
        user: true,
        payment: true,
        items: true,
      },
    });

    if (!updatedOrder) {
      throw new NotFoundException(`Order dengan ID ${orderId} tidak ditemukan`);
    }

    const sizeIds = updatedOrder.items
      .filter((item) => item.sizeId)
      .map((item) => item.sizeId);

    let sizeMap = new Map();
    if (sizeIds.length > 0) {
      const sizes = await this.prisma.size.findMany({
        where: {
          id: {
            in: sizeIds.filter(
              (id) => id !== null && id !== undefined,
            ) as number[],
          },
        },
      });

      sizeMap = new Map(sizes.map((size) => [size.id, size]));
    }

    const orderWithSizeInfo = {
      ...updatedOrder,
      items: updatedOrder.items.map((item) => ({
        ...item,
        sizeInfo: item.sizeId ? sizeMap.get(item.sizeId) : null,
      })),
    };

    return orderWithSizeInfo;
  }
}
