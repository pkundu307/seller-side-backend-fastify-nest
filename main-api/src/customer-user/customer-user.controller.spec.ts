import { Test, TestingModule } from '@nestjs/testing';
import { CustomerUserController } from './customer-user.controller';
import { CustomerUserService } from './customer-user.service';

describe('CustomerUserController', () => {
  let controller: CustomerUserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerUserController],
      providers: [CustomerUserService],
    }).compile();

    controller = module.get<CustomerUserController>(CustomerUserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
