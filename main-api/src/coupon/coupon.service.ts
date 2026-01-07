import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { DiscountType } from '@prisma/client';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  /**
   * (Admin) Get all coupons
   */
  async findAll() {
    return this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        discount: {
          select: { name: true, discountType: true, discountValue: true },
        },
      },
    });
  }

  /**
   * (Admin) Create a new coupon
   */
  async create(dto: CreateCouponDto) {
    // 1. Check if discount exists
    const discount = await this.prisma.discount.findUnique({
      where: { id: dto.discountId },
    });
    if (!discount) {
      throw new NotFoundException(`Discount with ID "${dto.discountId}" not found.`);
    }

    // 2. Check if coupon code already exists
    const existingCoupon = await this.prisma.coupon.findUnique({
      where: { code: dto.code },
    });
    if (existingCoupon) {
      throw new ConflictException(`Coupon code "${dto.code}" already exists.`);
    }

    // 3. Create the coupon
    return this.prisma.coupon.create({
      data: dto,
    });
  }

  /**
   * (Public) Validate a coupon for the checkout page
   */
  async validate(dto: ValidateCouponDto) {
    const { code, subtotal } = dto;

    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code },
      include: { discount: true },
    });

    // --- All Validation Logic ---
    if (!coupon || !coupon.active || !coupon.discount) {
      throw new BadRequestException('This coupon code is not valid.');
    }
    const now = new Date();
    if ((coupon.startsAt && coupon.startsAt > now) || (coupon.expiresAt && coupon.expiresAt < now)) {
      throw new BadRequestException('This coupon is not active at this time.');
    }
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('This coupon has reached its usage limit.');
    }
    if (coupon.discount.minOrderAmount && subtotal < coupon.discount.minOrderAmount.toNumber()) {
      throw new BadRequestException(`A minimum of ₹${coupon.discount.minOrderAmount} is needed to use this coupon.`);
    }

    // --- Calculate the discount value ---
    let discountAmount = 0;
    const { discount } = coupon;
    if (discount.discountType === DiscountType.percentage) {
      discountAmount = (subtotal * discount.discountValue.toNumber()) / 100;
      if (discount.maxDiscountAmount && discountAmount > discount.maxDiscountAmount.toNumber()) {
        discountAmount = discount.maxDiscountAmount.toNumber();
      }
    } else if (discount.discountType === DiscountType.fixed_amount) {
      discountAmount = discount.discountValue.toNumber();
    }
    
    // --- Return a clean, useful response for the frontend ---
    return {
      isValid: true,
      code: coupon.code,
      discount: {
        type: discount.discountType,
        value: discount.discountValue.toNumber(),
        calculatedDiscount: parseFloat(discountAmount.toFixed(2)),
      },
      newTotal: parseFloat((subtotal - discountAmount).toFixed(2)),
    };
  }
}