import { Test, TestingModule } from '@nestjs/testing';
import { SalesReturnController } from './sales-return.controller';
import { SalesReturnService } from './sales-return.service';

describe('SalesReturnController', () => {
  let controller: SalesReturnController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalesReturnController],
      providers: [SalesReturnService],
    }).compile();

    controller = module.get<SalesReturnController>(SalesReturnController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
