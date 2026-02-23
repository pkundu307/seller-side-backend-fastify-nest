import { Module } from '@nestjs/common';
import { QuotationService } from './quotation.service';
import { QuotationController } from './quotation.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { PdfService } from '../pdf.service';
@Module({
  controllers: [QuotationController],
  providers: [QuotationService, PrismaService,PdfService],
})
export class QuotationModule {}