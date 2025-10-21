import { Test, TestingModule } from '@nestjs/testing';
import { PredefinedAssetsController } from './customization-image.controller';
import { PredefinedAssetsService } from './predefined-assets.service';

describe('PredefinedAssetsController', () => {
  let controller: PredefinedAssetsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PredefinedAssetsController],
      providers: [PredefinedAssetsService],
    }).compile();

    controller = module.get<PredefinedAssetsController>(PredefinedAssetsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
