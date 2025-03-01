import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import Xendit from 'xendit-node';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CustomerService {
    private readonly xenditInstance: any;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) {
        this.xenditInstance = new Xendit({
            secretKey: this.configService.get<string>('XENDIT_SECRET_KEY'),
        });
    }

    async createCustomer(payload: any): Promise<any> {
        const customers = this.xenditInstance.Customers;

        try {
            const createdCustomer = await customers.create(payload);

            const savedCustomer = await this.prisma.customer.create({
                data: {
                    xenditCustomerId: createdCustomer.id,
                    email: createdCustomer.email,
                    phoneNumber: createdCustomer.phone_number,
                    givenNames: createdCustomer.given_names,
                    surname: createdCustomer.surname,
                    userId: null, // Belum terhubung ke user aplikasi saat create customer Xendit
                },
            });

            return savedCustomer;
        } catch (error) {
            console.error('Error creating Customer:', error);
            throw new Error('Gagal membuat Customer Xendit.');
        }
    }

    async getCustomerById(customerId: string): Promise<any> {
        const customers = this.xenditInstance.Customers;

        try {
            const customerXendit = await customers.getById(customerId);

            await this.prisma.customer.update({
                where: { xenditCustomerId: customerId },
                data: {
                    email: customerXendit.email,
                    phoneNumber: customerXendit.phone_number,
                    givenNames: customerXendit.given_names,
                    surname: customerXendit.surname,
                },
            });

            const customerDB = await this.prisma.customer.findUnique({
                where: { xenditCustomerId: customerId },
            });
            return customerDB;
        } catch (error) {
            console.error('Error getting Customer by ID:', error);
            throw new Error('Gagal mendapatkan Customer.');
        }
    }

    async listCustomers(queryParams?: any): Promise<any[]> {
        const customers = this.xenditInstance.Customers;

        try {
            const customerListXendit = await customers.list(queryParams);
            return customerListXendit.data;
        } catch (error) {
            console.error('Error listing Customers:', error);
            throw new Error('Gagal mendapatkan daftar Customer.');
        }
    }

    async updateCustomer(customerId: string, payload: any): Promise<any> {
        const customers = this.xenditInstance.Customers;

        try {
            const updatedCustomerXendit = await customers.update(customerId, payload);

            await this.prisma.customer.update({
                where: { xenditCustomerId: customerId },
                data: {
                    email: updatedCustomerXendit.email,
                    phoneNumber: updatedCustomerXendit.phone_number,
                    givenNames: updatedCustomerXendit.given_names,
                    surname: updatedCustomerXendit.surname,
                },
            });

            const customerDB = await this.prisma.customer.findUnique({
                where: { xenditCustomerId: customerId },
            });
            return customerDB;
        } catch (error) {
            console.error('Error updating Customer:', error);
            throw new Error('Gagal mengupdate Customer.');
        }
    }
}