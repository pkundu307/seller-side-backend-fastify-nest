import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { CouponsService } from './coupon.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator'; // Assuming you have these
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('Coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post('/validate')
  @ApiOperation({ summary: 'Validate a coupon code (Public)' })
  @ApiResponse({ status: 201, description: 'Coupon is valid, returns discount details.'})
  @ApiResponse({ status: 400, description: 'Coupon is invalid (expired, not found, etc.).'})
  validate(@Body() validateCouponDto: ValidateCouponDto) {
    return this.couponsService.validate(validateCouponDto);
  }

  @Post()
  @Roles('admin') // Protect this route for admins only
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new coupon (Admin)' })
  create(@Body() createCouponDto: CreateCouponDto) {
    return this.couponsService.create(createCouponDto);
  }

  @Get()
  @Roles('admin') // Protect this route for admins only
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all coupons (Admin)' })
  findAll() {
    return this.couponsService.findAll();
  }
}