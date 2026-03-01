import { Test, TestingModule } from '@nestjs/testing';
import { PaymentOutService } from './payment-out.service';

describe('PaymentOutService', () => {
  let service: PaymentOutService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentOutService],
    }).compile();

    service = module.get<PaymentOutService>(PaymentOutService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
