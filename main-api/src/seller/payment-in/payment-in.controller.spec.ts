import { Test, TestingModule } from '@nestjs/testing';
import { PaymentInController } from './payment-in.controller';
import { PaymentInService } from './payment-in.service';

describe('PaymentInController', () => {
  let controller: PaymentInController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentInController],
      providers: [PaymentInService],
    }).compile();

    controller = module.get<PaymentInController>(PaymentInController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
