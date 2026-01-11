import { Module } from '@nestjs/common';
import { SellerService } from './seller.service';
import { SellerController } from './seller.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PdfModule } from './pdf.module';

@Module({
    imports: [PrismaModule, PdfModule], // <-- ADD PdfModule

  controllers: [SellerController],
  providers: [SellerService],
})
export class SellerModule {}
