import { Test, TestingModule } from '@nestjs/testing';
import { Gstr1Service } from './gstr1.service';

describe('Gstr1Service', () => {
  let service: Gstr1Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Gstr1Service],
    }).compile();

    service = module.get<Gstr1Service>(Gstr1Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
