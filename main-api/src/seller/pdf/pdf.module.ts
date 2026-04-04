import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PdfService } from './pdf.service';
import { PaymentInModule } from '../payment-in/payment-in.module';
import { SalesReturnModule } from '../sales-return/sales-return.module';
import { ReportsModule } from '../reports/reports.module';
import { ProformaInvoiceModule } from '../proforma-invoice/proforma-invoice.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { PurchasesModule } from '../purchases/purchases.module';
import { PaymentOutModule } from '../payment-out/payment-out.module';
import { DebitNoteModule } from '../debit-note/debit-note.module';
import { PartyModule } from '../party/party.module';

@Module({
  imports: [PrismaModule, PaymentInModule, SalesReturnModule, ReportsModule, ProformaInvoiceModule, ExpensesModule, PurchasesModule, PaymentOutModule, DebitNoteModule, PartyModule],
  providers: [PdfService],
  exports: [PdfService], // Export the service so other modules can use it
})
export class PdfModule {}