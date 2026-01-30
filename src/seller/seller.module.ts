import { forwardRef, Module } from '@nestjs/common';
import { SellerService } from './seller.service';
import { SellerController } from './seller.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PdfModule } from './pdf.module';
import { QuotationModule } from './quotation/quotation.module';
import { PdfService } from './pdf.service';
import { PaymentInModule } from './payment-in/payment-in.module';

@Module({
    imports: [PrismaModule, PdfModule,QuotationModule,forwardRef(() => PaymentInModule)], // <-- ADD PdfModule

  controllers: [SellerController],
  providers: [SellerService,PdfService],
  exports: [SellerService],
})
export class SellerModule {}
