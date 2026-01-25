import { Module } from '@nestjs/common';
import { BankCashChequeService } from './bank-cash-cheque.service';
import { BankCashChequeController } from './bank-cash-cheque.controller';

@Module({
  controllers: [BankCashChequeController],
  providers: [BankCashChequeService],
})
export class BankCashChequeModule {}
