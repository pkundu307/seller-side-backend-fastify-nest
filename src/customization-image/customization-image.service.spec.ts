import { Test, TestingModule } from '@nestjs/testing';
import { CustomizationImageService } from './predefined-assets.service';

describe('CustomizationImageService', () => {
  let service: CustomizationImageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomizationImageService],
    }).compile();

    service = module.get<CustomizationImageService>(CustomizationImageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
