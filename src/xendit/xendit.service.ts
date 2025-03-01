import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { HttpService } from '@nestjs/axios'; 
import { catchError, firstValueFrom } from 'rxjs';

@Injectable()
export class XenditService {
  private readonly secretKey: string;
  private readonly xenditBaseUrl = 'https://api.xendit.co'; // Base URL Xendit API

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.secretKey = this.configService.get<string>('XENDIT_SECRET_KEY'); // Ambil secret key dari env
    if (!this.secretKey) {
      throw new Error('XENDIT_SECRET_KEY tidak ditemukan di environment variables!');
    }
  }

  async createPaymentRequest(payload: any): Promise<any> {
    const url = `${this.xenditBaseUrl}/payment_requests`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(this.secretKey + ':').toString('base64')}`,
    };
  
    // TAMBAHKAN BARIS LOGGING PAYLOAD DI SINI:
    console.log('PAYLOAD YANG DIKIRIM KE XENDIT API:');
    console.log(JSON.stringify(payload, null, 2)); // Cetak payload JSON, lebih mudah dibaca
  
    try {
      const response = await firstValueFrom(
        this.httpService.post(url, payload, { headers }).pipe(
          catchError((error: AxiosError) => {
            console.error('Error creating Xendit Payment Request:', error.response.data);
            throw new BadRequestException('Gagal membuat Payment Request Xendit', error.response.data);
          }),
        ),
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

}