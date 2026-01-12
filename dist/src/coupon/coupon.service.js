"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouponsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let CouponsService = class CouponsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
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
    async create(dto) {
        const discount = await this.prisma.discount.findUnique({
            where: { id: dto.discountId },
        });
        if (!discount) {
            throw new common_1.NotFoundException(`Discount with ID "${dto.discountId}" not found.`);
        }
        const existingCoupon = await this.prisma.coupon.findUnique({
            where: { code: dto.code },
        });
        if (existingCoupon) {
            throw new common_1.ConflictException(`Coupon code "${dto.code}" already exists.`);
        }
        return this.prisma.coupon.create({
            data: dto,
        });
    }
    async validate(dto) {
        const { code, subtotal } = dto;
        const coupon = await this.prisma.coupon.findUnique({
            where: { code: code },
            include: { discount: true },
        });
        if (!coupon || !coupon.active || !coupon.discount) {
            throw new common_1.BadRequestException('This coupon code is not valid.');
        }
        const now = new Date();
        if ((coupon.startsAt && coupon.startsAt > now) || (coupon.expiresAt && coupon.expiresAt < now)) {
            throw new common_1.BadRequestException('This coupon is not active at this time.');
        }
        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
            throw new common_1.BadRequestException('This coupon has reached its usage limit.');
        }
        if (coupon.discount.minOrderAmount && subtotal < coupon.discount.minOrderAmount.toNumber()) {
            throw new common_1.BadRequestException(`A minimum of ₹${coupon.discount.minOrderAmount} is needed to use this coupon.`);
        }
        let discountAmount = 0;
        const { discount } = coupon;
        if (discount.discountType === client_1.DiscountType.percentage) {
            discountAmount = (subtotal * discount.discountValue.toNumber()) / 100;
            if (discount.maxDiscountAmount && discountAmount > discount.maxDiscountAmount.toNumber()) {
                discountAmount = discount.maxDiscountAmount.toNumber();
            }
        }
        else if (discount.discountType === client_1.DiscountType.fixed_amount) {
            discountAmount = discount.discountValue.toNumber();
        }
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
};
exports.CouponsService = CouponsService;
exports.CouponsService = CouponsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CouponsService);
//# sourceMappingURL=coupon.service.js.map