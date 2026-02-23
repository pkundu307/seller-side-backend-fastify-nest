import { Module, forwardRef } from '@nestjs/common';
import { PaymentInService } from './payment-in.service';
import { PaymentInController } from './payment-in.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { SellerModule } from '../seller.module';

@Module({
  // Use forwardRef to allow PaymentIn to use SellerService, 
  // and SellerModule to use PaymentIn (if needed later) without crashing
  imports: [forwardRef(() => SellerModule)], 
  controllers: [PaymentInController],
  providers: [PaymentInService, PrismaService],
  exports: [PaymentInService],
})
export class PaymentInModule {}