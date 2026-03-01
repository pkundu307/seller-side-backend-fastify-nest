import { Test, TestingModule } from '@nestjs/testing';
import { PaymentOutController } from './payment-out.controller';

describe('PaymentOutController', () => {
  let controller: PaymentOutController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentOutController],
    }).compile();

    controller = module.get<PaymentOutController>(PaymentOutController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
