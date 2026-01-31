import { Test, TestingModule } from '@nestjs/testing';
import { ProformaInvoiceController } from './proforma-invoice.controller';
import { ProformaInvoiceService } from './proforma-invoice.service';

describe('ProformaInvoiceController', () => {
  let controller: ProformaInvoiceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProformaInvoiceController],
      providers: [ProformaInvoiceService],
    }).compile();

    controller = module.get<ProformaInvoiceController>(ProformaInvoiceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
