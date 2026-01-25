import { Module } from '@nestjs/common';
import { SellerService } from './seller.service';
import { SellerController } from './seller.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PdfModule } from './pdf.module';
import { QuotationModule } from './quotation/quotation.module';
import { PdfService } from './pdf.service';

@Module({
    imports: [PrismaModule, PdfModule,QuotationModule], // <-- ADD PdfModule

  controllers: [SellerController],
  providers: [SellerService,PdfService],
})
export class SellerModule {}
