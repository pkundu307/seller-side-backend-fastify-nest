import { forwardRef, Module } from '@nestjs/common';
import { SalesReturnService } from './sales-return.service';
import { SalesReturnController } from './sales-return.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { SellerModule } from '../seller.module';

@Module({
  imports: [  forwardRef(() => SellerModule)],
  controllers: [SalesReturnController],
  providers: [SalesReturnService, PrismaService],
})
export class SalesReturnModule {}