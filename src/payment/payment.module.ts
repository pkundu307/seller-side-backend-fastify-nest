import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PrismaModule } from '../prisma/prisma.module';
// import { ConfigModule } from '@nestjs/config';
import { razorpayProvider } from './razorpay.provider';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentController],
  providers: [PaymentService, razorpayProvider],
})
export class PaymentModule {}