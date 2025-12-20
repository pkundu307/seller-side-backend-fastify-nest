import { Test, TestingModule } from '@nestjs/testing';
import { HomepageAdminService } from './homepage-admin.service';

describe('HomepageAdminService', () => {
  let service: HomepageAdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HomepageAdminService],
    }).compile();

    service = module.get<HomepageAdminService>(HomepageAdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
