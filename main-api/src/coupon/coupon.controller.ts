import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CouponsService } from './coupon.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { CreateDiscountTargetDto } from './dto/create-discount-target.dto';
import { ListCouponsDto } from './dto/list-coupons.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Admin')
@Controller('admin/coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  // ─── DISCOUNTS ───────────────────────────────────────────────────

  @Post('discounts')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new discount rule' })
  createDiscount(@Body() dto: CreateDiscountDto) {
    return this.couponsService.createDiscount(dto);
  }

  @Get('discounts')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all discount rules with linked coupons and targets' })
  findAllDiscounts() {
    return this.couponsService.findAllDiscounts();
  }

  @Get('discounts/:id')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single discount rule by ID' })
  findOneDiscount(@Param('id') id: string) {
    return this.couponsService.findOneDiscount(id);
  }

  @Patch('discounts/:id')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a discount rule' })
  updateDiscount(@Param('id') id: string, @Body() dto: Partial<CreateDiscountDto>) {
    return this.couponsService.updateDiscount(id, dto);
  }

  @Delete('discounts/:id')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a discount rule (blocked if coupons are linked)' })
  deleteDiscount(@Param('id') id: string) {
    return this.couponsService.deleteDiscount(id);
  }

  // ─── DISCOUNT TARGETS ────────────────────────────────────────────

  @Post('discounts/:discountId/targets')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a product/category/brand target to a discount' })
  addTarget(
    @Param('discountId') discountId: string,
    @Body() dto: CreateDiscountTargetDto,
  ) {
    return this.couponsService.addTarget(discountId, dto);
  }

  @Delete('discounts/:discountId/targets/:targetId')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a target from a discount' })
  removeTarget(
    @Param('discountId') discountId: string,
    @Param('targetId') targetId: string,
  ) {
    return this.couponsService.removeTarget(discountId, targetId);
  }

  // ─── COUPONS ─────────────────────────────────────────────────────

  @Post()
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new coupon code linked to a discount' })
  createCoupon(@Body() dto: CreateCouponDto) {
    return this.couponsService.createCoupon(dto);
  }

  @Get()
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all coupons with pagination and active filter' })
  findAllCoupons(@Query() query: ListCouponsDto) {
    return this.couponsService.findAllCoupons(query);
  }

  @Get(':id')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get full details of a single coupon' })
  findOneCoupon(@Param('id') id: string) {
    return this.couponsService.findOneCoupon(id);
  }

  @Patch(':id')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update coupon — code, limits, expiry, channel, flags' })
  updateCoupon(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponsService.updateCoupon(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a coupon (blocked if usage records exist)' })
  deleteCoupon(@Param('id') id: string) {
    return this.couponsService.deleteCoupon(id);
  }

  @Patch(':id/toggle')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate or deactivate a coupon' })
  toggleCoupon(
    @Param('id') id: string,
    @Body('active') active: boolean,
  ) {
    return this.couponsService.toggleCoupon(id, active);
  }

  // ─── ANALYTICS ───────────────────────────────────────────────────

  @Get(':id/stats')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get usage stats — total uses, discount given, reversals' })
  getCouponStats(@Param('id') id: string) {
    return this.couponsService.getCouponStats(id);
  }

  @Get(':id/usages')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get paginated usage log with customer details' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getCouponUsageLog(
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.couponsService.getCouponUsageLog(id, +page, +limit);
  }
}
