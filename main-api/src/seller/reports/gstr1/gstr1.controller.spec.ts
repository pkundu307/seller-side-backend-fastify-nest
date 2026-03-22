import { Test, TestingModule } from '@nestjs/testing';
import { Gstr1Controller } from './gstr1.controller';
import { Gstr1Service } from './gstr1.service';

describe('Gstr1Controller', () => {
  let controller: Gstr1Controller;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [Gstr1Controller],
      providers: [Gstr1Service],
    }).compile();

    controller = module.get<Gstr1Controller>(Gstr1Controller);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
