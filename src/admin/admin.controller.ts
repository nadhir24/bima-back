import { Controller, Get, Param, Patch, Body, Query } from '@nestjs/common';
import { AdminService } from './admin.service'; // Buat AdminService nanti

@Controller('admin/orders') // URL path untuk endpoint admin orders
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  getOrders(@Query() query: any) { // Bisa filter, pagination, sorting nanti
    return this.adminService.getAllOrders(query);
  }

  @Get(':orderId')
  getOrderById(@Param('orderId') orderId: string) {
    return this.adminService.getOrderById(Number(orderId));
  }

  @Patch(':orderId/status')
  updateOrderStatus(@Param('orderId') orderId: string, @Body('status') status: string) {
    return this.adminService.updateOrderStatus(Number(orderId), status);
  }
}