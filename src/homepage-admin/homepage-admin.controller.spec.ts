import { Test, TestingModule } from '@nestjs/testing';
import { HomepageAdminController } from './homepage-admin.controller';
import { HomepageAdminService } from './homepage-admin.service';

describe('HomepageAdminController', () => {
  let controller: HomepageAdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HomepageAdminController],
      providers: [HomepageAdminService],
    }).compile();

    controller = module.get<HomepageAdminController>(HomepageAdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
