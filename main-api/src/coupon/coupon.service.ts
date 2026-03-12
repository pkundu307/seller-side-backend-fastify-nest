import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { CreateDiscountTargetDto } from './dto/create-discount-target.dto';
import { ListCouponsDto } from './dto/list-coupons.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  // ─── DISCOUNT CRUD ───────────────────────────────────────────────

  async createDiscount(dto: CreateDiscountDto) {
    return this.prisma.discount.create({ data: dto });
  }

  async findAllDiscounts() {
    return this.prisma.discount.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        coupons: { select: { id: true, code: true, active: true, usedCount: true } },
        targets: true,
      },
    });
  }

  async findOneDiscount(id: string) {
    const discount = await this.prisma.discount.findUnique({
      where: { id },
      include: { coupons: true, targets: true },
    });
    if (!discount) throw new NotFoundException(`Discount "${id}" not found.`);
    return discount;
  }

  async updateDiscount(id: string, dto: Partial<CreateDiscountDto>) {
    await this.findOneDiscount(id);
    return this.prisma.discount.update({ where: { id }, data: dto });
  }

  async deleteDiscount(id: string) {
    await this.findOneDiscount(id);
    const linkedCoupons = await this.prisma.coupon.count({ where: { discountId: id } });
    if (linkedCoupons > 0) {
      throw new BadRequestException(
        `Cannot delete. ${linkedCoupons} coupon(s) are linked to this discount.`,
      );
    }
    return this.prisma.discount.delete({ where: { id } });
  }

  // ─── DISCOUNT TARGETS ────────────────────────────────────────────

  async addTarget(discountId: string, dto: CreateDiscountTargetDto) {
    await this.findOneDiscount(discountId);
    return this.prisma.discountTarget.create({ data: { discountId, ...dto } });
  }

  async removeTarget(discountId: string, targetId: string) {
    const target = await this.prisma.discountTarget.findFirst({
      where: { id: targetId, discountId },
    });
    if (!target) throw new NotFoundException(`Target "${targetId}" not found on this discount.`);
    return this.prisma.discountTarget.delete({ where: { id: targetId } });
  }

  // ─── COUPON CRUD ─────────────────────────────────────────────────

  async createCoupon(dto: CreateCouponDto) {
    const discount = await this.prisma.discount.findUnique({ where: { id: dto.discountId } });
    if (!discount) throw new NotFoundException(`Discount "${dto.discountId}" not found.`);

    const existing = await this.prisma.coupon.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Coupon code "${dto.code}" already exists.`);

    return this.prisma.coupon.create({ data: dto });
  }

async findAllCoupons(query: ListCouponsDto) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const where = query.active !== undefined ? { active: query.active } : {};

  const [data, total] = await this.prisma.$transaction([
    this.prisma.coupon.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        discount: {
          select: { name: true, discountType: true, discountValue: true, minOrderAmount: true },
        },
        _count: { select: { usages: true } },
      },
    }),
    this.prisma.coupon.count({ where }),
  ]);

  return {
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}


  async findOneCoupon(id: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: {
        discount: { include: { targets: true } },
        _count: { select: { usages: true } },
      },
    });
    if (!coupon) throw new NotFoundException(`Coupon "${id}" not found.`);
    return coupon;
  }

  async updateCoupon(id: string, dto: UpdateCouponDto) {
    await this.findOneCoupon(id);

    // If code is being changed, check it's not taken
    if (dto.code) {
      const conflict = await this.prisma.coupon.findFirst({
        where: { code: dto.code, NOT: { id } },
      });
      if (conflict) throw new ConflictException(`Coupon code "${dto.code}" already exists.`);
    }

    return this.prisma.coupon.update({ where: { id }, data: dto });
  }

  async deleteCoupon(id: string) {
    await this.findOneCoupon(id);
    const usages = await this.prisma.couponUsage.count({ where: { couponId: id } });
    if (usages > 0) {
      throw new BadRequestException(
        `Cannot delete. This coupon has ${usages} usage record(s). Deactivate it instead.`,
      );
    }
    return this.prisma.coupon.delete({ where: { id } });
  }

  async toggleCoupon(id: string, active: boolean) {
    await this.findOneCoupon(id);
    return this.prisma.coupon.update({ where: { id }, data: { active } });
  }

  // ─── COUPON ANALYTICS ────────────────────────────────────────────

  async getCouponStats(id: string) {
    await this.findOneCoupon(id);

    const [totalUsages, activeUsages, totalDiscountGiven] = await this.prisma.$transaction([
      this.prisma.couponUsage.count({ where: { couponId: id } }),
      this.prisma.couponUsage.count({ where: { couponId: id, isReversed: false } }),
      this.prisma.couponUsage.aggregate({
        where: { couponId: id, isReversed: false },
        _sum: { discountApplied: true },
      }),
    ]);

    return {
      totalUsages,
      activeUsages,
      reversedUsages: totalUsages - activeUsages,
      totalDiscountGiven: totalDiscountGiven._sum.discountApplied ?? 0,
    };
  }

  async getCouponUsageLog(id: string, page = 1, limit = 20) {
    await this.findOneCoupon(id);
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.couponUsage.findMany({
        where: { couponId: id },
        skip,
        take: limit,
        orderBy: { usedAt: 'desc' },
        include: {
          customerUser: { select: { id: true, name: true, email: true, phoneNumber: true } },
        },
      }),
      this.prisma.couponUsage.count({ where: { couponId: id } }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
  async validateCoupon(dto: ValidateCouponDto) {
  const coupon = await this.prisma.coupon.findUnique({
    where: { code: dto.code },
    include: {
      discount: {
        include: { targets: true },
      },
    },
  });

  if (!coupon) throw new NotFoundException('Coupon code not found.');
  if (!coupon.active) throw new BadRequestException('This coupon is no longer active.');

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now)
    throw new BadRequestException('This coupon is not active yet.');
  if (coupon.expiresAt && coupon.expiresAt < now)
    throw new BadRequestException('This coupon has expired.');
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)
    throw new BadRequestException('This coupon has reached its usage limit.');

  const discount = coupon.discount;
  if (discount.minOrderAmount && dto.subtotal < Number(discount.minOrderAmount))
    throw new BadRequestException(
      `Minimum order amount of ₹${discount.minOrderAmount} required.`,
    );

  // ─── Target Check ─────────────────────────────────────────────
  if (discount.targets.length > 0) {
    if (!dto.cartItems || dto.cartItems.length === 0)
      throw new BadRequestException('Cart items required to validate this coupon.');

    const cartProductIds = dto.cartItems.map((i) => i.productId);
    const cartCategoryIds = dto.cartItems.map((i) => i.categoryId).filter(Boolean);
    const cartBrands = dto.cartItems.map((i) => i.brand).filter(Boolean);

    const isTargetMet = discount.targets.some((t) => {
      if (t.productId) return cartProductIds.includes(t.productId);
      if (t.categoryId) return cartCategoryIds.includes(t.categoryId);
      if (t.brand) return cartBrands.includes(t.brand);
      return false;
    });

    if (!isTargetMet)
      throw new BadRequestException(
        'This coupon is not applicable on items in your cart.',
      );
  }

  // ─── Calculate Discount ───────────────────────────────────────
  let calculatedDiscount = 0;

  if (discount.discountType === 'percentage') {
    calculatedDiscount = (dto.subtotal * Number(discount.discountValue)) / 100;
    if (discount.maxDiscountAmount) {
      calculatedDiscount = Math.min(calculatedDiscount, Number(discount.maxDiscountAmount));
    }
  } else if (discount.discountType === 'fixed_amount') {
    calculatedDiscount = Number(discount.discountValue);
    if (discount.maxDiscountAmount) {
      calculatedDiscount = Math.min(calculatedDiscount, Number(discount.maxDiscountAmount));
    }
  } else if (discount.discountType === 'free_shipping') {
    calculatedDiscount = 0; // handled on frontend shipping fee
  }

  calculatedDiscount = Math.min(calculatedDiscount, dto.subtotal);

  return {
    valid: true,
    code: coupon.code,
    discount: {
      type: discount.discountType,
      value: Number(discount.discountValue),
      calculatedDiscount: Math.round(calculatedDiscount * 100) / 100,
    },
    newTotal: Math.max(dto.subtotal - calculatedDiscount, 0),
  };
}

}
