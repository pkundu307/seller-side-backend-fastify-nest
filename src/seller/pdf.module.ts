import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PdfService } from './pdf.service';
import { PaymentInModule } from './payment-in/payment-in.module';
import { SalesReturnModule } from './sales-return/sales-return.module';

@Module({
  imports: [PrismaModule, PaymentInModule, SalesReturnModule],
  providers: [PdfService],
  exports: [PdfService], // Export the service so other modules can use it
})
export class PdfModule {}