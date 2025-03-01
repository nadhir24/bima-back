import { Test, TestingModule } from '@nestjs/testing';
import { PaymentRequestController } from './payment-request.controller';

describe('PaymentRequestController', () => {
  let controller: PaymentRequestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentRequestController],
    }).compile();

    controller = module.get<PaymentRequestController>(PaymentRequestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
