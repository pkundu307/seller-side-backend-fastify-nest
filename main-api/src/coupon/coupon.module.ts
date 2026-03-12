import { Module } from '@nestjs/common';
import { CouponsService } from './coupon.service';
import { CouponsController } from './coupon.controller';
import { PublicCouponsController } from './public-coupons.controller';

@Module({
  controllers: [CouponsController,PublicCouponsController],
  providers: [CouponsService],
})
export class CouponModule {}
