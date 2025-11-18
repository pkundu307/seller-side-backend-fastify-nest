import { Test, TestingModule } from '@nestjs/testing';
import { ProductSearchController } from './product-search.controller';
import { ProductSearchService } from './product-search.service';

describe('ProductSearchController', () => {
  let controller: ProductSearchController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductSearchController],
      providers: [ProductSearchService],
    }).compile();

    controller = module.get<ProductSearchController>(ProductSearchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
