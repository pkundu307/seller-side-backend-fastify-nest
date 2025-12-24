import { Module } from '@nestjs/common';
import { CouponsService } from './coupon.service';
import { CouponsController } from './coupon.controller';

@Module({
  controllers: [CouponsController],
  providers: [CouponsService],
})
export class CouponModule {}
