import { Test, TestingModule } from '@nestjs/testing';
import { ProformaInvoiceService } from './proforma-invoice.service';

describe('ProformaInvoiceService', () => {
  let service: ProformaInvoiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProformaInvoiceService],
    }).compile();

    service = module.get<ProformaInvoiceService>(ProformaInvoiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
