import { Test, TestingModule } from '@nestjs/testing';
import { CustomizationImageController } from './customization-image.controller';
import { CustomizationImageService } from './customization-image.service';

describe('CustomizationImageController', () => {
  let controller: CustomizationImageController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomizationImageController],
      providers: [CustomizationImageService],
    }).compile();

    controller = module.get<CustomizationImageController>(CustomizationImageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
