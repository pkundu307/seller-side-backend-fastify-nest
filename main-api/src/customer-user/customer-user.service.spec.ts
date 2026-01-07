import { Test, TestingModule } from '@nestjs/testing';
import { CustomerUserService } from './customer-user.service';

describe('CustomerUserService', () => {
  let service: CustomerUserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomerUserService],
    }).compile();

    service = module.get<CustomerUserService>(CustomerUserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
