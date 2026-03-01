import { Module } from '@nestjs/common';
import { PaymentOutController } from './payment-out.controller';
import { PaymentOutService } from './payment-out.service';

@Module({
  controllers: [PaymentOutController],
  providers: [PaymentOutService]
})
export class PaymentOutModule {}
