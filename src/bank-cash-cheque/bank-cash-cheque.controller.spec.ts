import { Test, TestingModule } from '@nestjs/testing';
import { BankCashChequeController } from './bank-cash-cheque.controller';
import { BankCashChequeService } from './bank-cash-cheque.service';

describe('BankCashChequeController', () => {
  let controller: BankCashChequeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BankCashChequeController],
      providers: [BankCashChequeService],
    }).compile();

    controller = module.get<BankCashChequeController>(BankCashChequeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
