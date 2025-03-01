import { Test, TestingModule } from '@nestjs/testing';
import { PaymentRequestService } from './payment-request.service';

describe('PaymentRequestService', () => {
  let service: PaymentRequestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentRequestService],
    }).compile();

    service = module.get<PaymentRequestService>(PaymentRequestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
