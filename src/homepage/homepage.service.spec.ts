import { Test, TestingModule } from '@nestjs/testing';
import { HomepageService } from './homepage.service';

describe('HomepageService', () => {
  let service: HomepageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HomepageService],
    }).compile();

    service = module.get<HomepageService>(HomepageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
