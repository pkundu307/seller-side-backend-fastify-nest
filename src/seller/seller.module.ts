import { forwardRef, Module } from '@nestjs/common';
import { SellerService } from './seller.service';
import { SellerController } from './seller.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PdfModule } from './pdf.module';
import { QuotationModule } from './quotation/quotation.module';
import { PdfService } from './pdf.service';
import { PaymentInModule } from './payment-in/payment-in.module';
import { ReportsModule } from './reports/reports.module';
import { ProformaInvoiceModule } from './proforma-invoice/proforma-invoice.module';
import { ExpensesModule } from './expenses/expenses.module';

@Module({
  imports: [
    PrismaModule,
    PdfModule,
    QuotationModule,
    ProformaInvoiceModule,
    forwardRef(() => PaymentInModule),
    forwardRef(() => ProformaInvoiceModule),
    forwardRef(() => ReportsModule),
       ExpensesModule,
  ], // <-- ADD PdfModule

  controllers: [SellerController],
  providers: [SellerService, PdfService],
  exports: [SellerService],
})
export class SellerModule {}
