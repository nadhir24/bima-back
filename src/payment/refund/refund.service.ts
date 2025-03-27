import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { SnapService } from '../snap/snap.service';
import {
  CreateRefundDto,
  RefundResponse,
} from '../interfaces/refund.interface';

@Injectable()
export class RefundService {
  constructor(
    private prisma: PrismaService,
    private snapService: SnapService,
  ) {}

  async createRefund(dto: CreateRefundDto): Promise<RefundResponse> {
    return this.prisma.$transaction(async (prisma) => {
      // Cek payment exists
      const payment = await prisma.payment.findUnique({
        where: { id: dto.paymentId },
        include: { invoice: true },
      });

      if (!payment) {
        throw new HttpException('Payment not found', HttpStatus.NOT_FOUND);
      }

      if (payment.status !== 'SETTLEMENT') {
        throw new HttpException(
          'Payment must be settled before refund',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (dto.amount > payment.amount) {
        throw new HttpException(
          'Refund amount cannot exceed payment amount',
          HttpStatus.BAD_REQUEST,
        );
      }

      try {
        // Buat refund di Midtrans
        const refundId = `refund-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Simpan refund ke database
        const refund = await prisma.refund.create({
          data: {
            paymentId: dto.paymentId,
            refundId,
            status: 'PENDING',
            amount: dto.amount,
            reason: dto.reason,
          },
        });

        // Update payment status
        await prisma.payment.update({
          where: { id: dto.paymentId },
          data: { status: 'REFUND_PENDING' },
        });

        return refund;
      } catch (error) {
        throw new HttpException(
          'Failed to create refund',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    });
  }

  async getRefundStatus(refundId: string): Promise<RefundResponse> {
    const refund = await this.prisma.refund.findUnique({
      where: { refundId },
    });

    if (!refund) {
      throw new HttpException('Refund not found', HttpStatus.NOT_FOUND);
    }

    return refund;
  }
}
