import { forwardRef, Module } from '@nestjs/common';
import { PaymentOutController } from './payment-out.controller';
import { PaymentOutService } from './payment-out.service';
import { SellerModule } from '../seller.module';

@Module({
  imports: [
        forwardRef(() => SellerModule), // <--- Add this

    ],
  controllers: [PaymentOutController],
  providers: [PaymentOutService]
})
export class PaymentOutModule {}
