export interface CreateRefundDto {
  paymentId: number;
  amount: number;
  reason: string;
}

export interface RefundResponse {
  refundId: string;
  status: string;
  amount: number;
  reason: string;
  createdAt: Date;
  updatedAt: Date;
}
