import { Controller, Post, Get, Param, Body, Query, Res, HttpStatus, Patch, UsePipes, ValidationPipe } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { Response } from 'express';
import { CreateCustomerDto } from '../dto/create-customer.dto'; // Import DTO
import { UpdateCustomerDto } from '../dto/update-customer.dto'; // Import DTO
import { ListCustomersDto } from '../dto/list-customer.dto'; // Import DTO

@Controller('payment/customer')
export class CustomerController {
    constructor(private readonly customerService: CustomerService) {}

    @Post()
    @UsePipes(new ValidationPipe()) // Aktifkan Validation Pipe untuk DTO
    async createCustomer(@Body() createCustomerDto: CreateCustomerDto, @Res() res: Response) { // Gunakan DTO
        try {
            const customer = await this.customerService.createCustomer(createCustomerDto);
            return res.status(HttpStatus.CREATED).json({
                message: 'Customer berhasil dibuat!',
                data: customer,
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Gagal membuat Customer',
                error: error.message,
            });
        }
    }

    @Get(':id')
    async getCustomerById(@Param('id') customerId: string, @Res() res: Response) {
        try {
            const customer = await this.customerService.getCustomerById(customerId);
            if (!customer) {
                return res.status(HttpStatus.NOT_FOUND).json({
                    message: 'Customer tidak ditemukan',
                });
            }
            return res.status(HttpStatus.OK).json({
                data: customer,
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Gagal mendapatkan Customer',
                error: error.message,
            });
        }
    }

    @Get()
    @UsePipes(new ValidationPipe()) // Aktifkan Validation Pipe untuk DTO
    async listCustomers(@Query() queryParams: ListCustomersDto, @Res() res: Response) { // Gunakan DTO
        try {
            const customers = await this.customerService.listCustomers(queryParams);
            return res.status(HttpStatus.OK).json({
                data: customers,
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Gagal mendapatkan daftar Customer',
                error: error.message,
            });
        }
    }

    @Patch(':id')
    @UsePipes(new ValidationPipe()) // Aktifkan Validation Pipe untuk DTO
    async updateCustomer(
        @Param('id') customerId: string,
        @Body() updateCustomerDto: UpdateCustomerDto,
        @Res() res: Response
    ) {
        try {
            const customer = await this.customerService.updateCustomer(customerId, updateCustomerDto);
            return res.status(HttpStatus.OK).json({
                message: 'Customer berhasil diupdate!',
                data: customer,
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Gagal mengupdate Customer',
                error: error.message,
            });
        }
    }
}