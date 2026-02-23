import { Test, TestingModule } from '@nestjs/testing';
import { PaymentInService } from './payment-in.service';

describe('PaymentInService', () => {
  let service: PaymentInService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentInService],
    }).compile();

    service = module.get<PaymentInService>(PaymentInService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
