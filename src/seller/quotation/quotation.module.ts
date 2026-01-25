import { Module } from '@nestjs/common';
import { QuotationService } from './quotation.service';
import { QuotationController } from './quotation.controller';
import { PrismaService } from 'src/prisma/prisma.service';
@Module({
  controllers: [QuotationController],
  providers: [QuotationService, PrismaService],
})
export class QuotationModule {}