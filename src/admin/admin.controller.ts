import { Controller, Get, Param, Patch, Body, Query, BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service'; // Buat AdminService nanti

@Controller('admin') // URL path untuk endpoint admin orders
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('products')
  getProducts(@Query() query: { page?: number; limit?: number }) {
    return this.adminService.getAllProducts(query);
  }

  @Get('orders')
  getOrders(@Query() query: { 
    page?: number; 
    limit?: number; 
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) {
    return this.adminService.getAllOrders(query);
  }

  @Get('orders/:orderId')
  async getOrderById(@Param('orderId') orderId: string) {
    try {
      console.log('Received orderId:', orderId);
      const numericOrderId = Number(orderId);
      
      if (isNaN(numericOrderId)) {
        throw new BadRequestException('Invalid order ID format');
      }
      
      return await this.adminService.getOrderById(numericOrderId);
    } catch (error) {
      console.error('Error in controller getOrderById:', error);
      throw error;
    }
  }

  @Patch('orders/:orderId/status')
  updateOrderStatus(@Param('orderId') orderId: string, @Body('status') status: string) {
    return this.adminService.updateOrderStatus(Number(orderId), status);
  }
}