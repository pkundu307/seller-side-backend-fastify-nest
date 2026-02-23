import { Test, TestingModule } from '@nestjs/testing';
import { BankCashChequeService } from './bank-cash-cheque.service';

describe('BankCashChequeService', () => {
  let service: BankCashChequeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BankCashChequeService],
    }).compile();

    service = module.get<BankCashChequeService>(BankCashChequeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
