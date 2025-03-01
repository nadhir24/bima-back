import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllOrders(query: any) { // Nanti implementasi filter, pagination, sorting
    return this.prisma.invoice.findMany({
      // ... tambahkan filter, pagination, sorting sesuai query ...
      include: {
        user: true, // Include relasi User (jika ada)
        payment: true, // Include relasi Payment
        items: true,  // Include Invoice Items
      },
    });
  }

  async getOrderById(orderId: number) {
    const order = await this.prisma.invoice.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        payment: true,
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order dengan ID ${orderId} tidak ditemukan`);
    }

    return order;
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

    return updatedOrder;
  }
}