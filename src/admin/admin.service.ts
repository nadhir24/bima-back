import { Injectable, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
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
                  catalogId: true
                }
              },
            },
          }),
          this.prisma.catalog.count()
        ]);

        // Transform price format from "Rp100.000" to number for easier calculation
        const transformedProducts = products.map(product => ({
          ...product,
          sizes: product.sizes.map(size => ({
            ...size,
            price: parseFloat(size.price.replace(/[^0-9]/g, '')),
          }))
        }));

        return {
          products: transformedProducts,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          currentPage: page,
        };
      } catch (error) {
        console.error("Error during Prisma call in getAllProducts:", error);
        throw new HttpException(
          'Failed to retrieve products from database.',
          HttpStatus.INTERNAL_SERVER_ERROR
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
  const page = query.page ? Number(query.page) : 1; // Ensure page is an integer
  const limit = query.limit ? Number(query.limit) : 10; // Ensure limit is an integer
  const skip = (page - 1) * limit; // Calculate the number of items to skip

  // Build filter conditions
  const whereConditions: any = {};

  // Filter by status if provided
  if (query.status && query.status !== 'all') {
    whereConditions.status = query.status;
  }

  // Filter by date range if provided
  if (query.startDate || query.endDate) {
    whereConditions.createdAt = {};
    
    if (query.startDate) {
      whereConditions.createdAt.gte = new Date(query.startDate);
    }
    
    if (query.endDate) {
      // Set end date to end of day
      const endDate = new Date(query.endDate);
      endDate.setHours(23, 59, 59, 999);
      whereConditions.createdAt.lte = endDate;
    }
  }

  // Search by order ID or customer name
  if (query.search) {
    whereConditions.OR = [
      {
        midtransOrderId: {
          contains: query.search,
          mode: 'insensitive'
        }
      },
      {
        user: {
          fullName: {
            contains: query.search,
            mode: 'insensitive'
          }
        }
      }
    ];
  }

  // Menggunakan Promise.all untuk menjalankan query data dan count secara paralel
  const [orders, totalCount] = await Promise.all([
    this.prisma.invoice.findMany({
      where: whereConditions,
      skip,
      take: limit, // Mengambil sejumlah data sesuai limit
      include: {
        user: true,    // Tetap include user
        payment: true, // Tetap include payment
        items: true    // Include items tanpa relasi size
      },
      orderBy: { // Opsional: Tambahkan urutan jika perlu, misal berdasarkan tanggal terbaru
        createdAt: 'desc'
      }
    }),
    this.prisma.invoice.count({
      where: whereConditions
    }), // Count dengan filter yang sama
  ]);

  // Ambil semua item ids untuk mengambil sizes
  const allSizeIds = orders
    .flatMap(order => order.items)
    .filter(item => item.sizeId)
    .map(item => item.sizeId);

  // Ambil size data dalam satu query
  let sizes = [];
  if (allSizeIds.length > 0) {
    sizes = await this.prisma.size.findMany({
      where: {
        id: {
          in: allSizeIds.filter(id => id !== null && id !== undefined) as number[]
        }
      }
    });
  }

  // Buat map untuk akses cepat
  const sizeMap = new Map(sizes.map(size => [size.id, size]));

  // Transform data untuk menambahkan informasi size ke item
  const ordersWithSizeInfo = orders.map(order => ({
    ...order,
    items: order.items.map(item => ({
      ...item,
      sizeInfo: item.sizeId ? sizeMap.get(item.sizeId) : null
    }))
  }));

  // Mengembalikan hasil
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
          id: orderId
        },
        include: {
          user: true,
          payment: true,
          items: true
        }
      });

      if (!order) {
        throw new NotFoundException(`Order dengan ID ${orderId} tidak ditemukan`);
      }

      // Ambil semua sizeId yang ada di item order
      const sizeIds = order.items
        .filter(item => item.sizeId)
        .map(item => item.sizeId);

      // Jika ada sizeId, ambil data size
      let sizeMap = new Map();
      if (sizeIds.length > 0) {
        const sizes = await this.prisma.size.findMany({
          where: {
            id: {
              in: sizeIds.filter(id => id !== null && id !== undefined) as number[]
            }
          }
        });
        
        // Buat map untuk akses cepat
        sizeMap = new Map(sizes.map(size => [size.id, size]));
      }

      // Tambahkan informasi size ke setiap item
      const orderWithSizeInfo = {
        ...order,
        items: order.items.map(item => ({
          ...item,
          sizeInfo: item.sizeId ? sizeMap.get(item.sizeId) : null
        }))
      };

      return orderWithSizeInfo;
    } catch (error) {
      console.error('Error in getOrderById:', error);
      throw new HttpException(
        'Failed to retrieve order details',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async updateOrderStatus(orderId: number, status: string) {
    const updatedOrder = await this.prisma.invoice.update({
      where: { id: orderId },
      data: { status: status }, // Update status invoice
      include: {
        user: true,
        payment: true,
        items: true,
      },
    });

    if (!updatedOrder) {
      throw new NotFoundException(`Order dengan ID ${orderId} tidak ditemukan`);
    }

    // Ambil semua sizeId yang ada di item order
    const sizeIds = updatedOrder.items
      .filter(item => item.sizeId)
      .map(item => item.sizeId);

    // Jika ada sizeId, ambil data size
    let sizeMap = new Map();
    if (sizeIds.length > 0) {
      const sizes = await this.prisma.size.findMany({
        where: {
          id: {
            in: sizeIds.filter(id => id !== null && id !== undefined) as number[]
          }
        }
      });
      
      // Buat map untuk akses cepat
      sizeMap = new Map(sizes.map(size => [size.id, size]));
    }

    // Tambahkan informasi size ke setiap item
    const orderWithSizeInfo = {
      ...updatedOrder,
      items: updatedOrder.items.map(item => ({
        ...item,
        sizeInfo: item.sizeId ? sizeMap.get(item.sizeId) : null
      }))
    };

    return orderWithSizeInfo;
  }
}