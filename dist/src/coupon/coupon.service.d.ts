import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
export declare class CouponsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<({
        discount: {
            name: string;
            discountType: import(".prisma/client").$Enums.DiscountType;
            discountValue: import("@prisma/client/runtime/library").Decimal;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        code: string;
        active: boolean;
        discountId: string;
        maxUses: number | null;
        usedCount: number;
        perUserLimit: number | null;
        startsAt: Date | null;
        expiresAt: Date | null;
    })[]>;
    create(dto: CreateCouponDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        code: string;
        active: boolean;
        discountId: string;
        maxUses: number | null;
        usedCount: number;
        perUserLimit: number | null;
        startsAt: Date | null;
        expiresAt: Date | null;
    }>;
    validate(dto: ValidateCouponDto): Promise<{
        isValid: boolean;
        code: string;
        discount: {
            type: import(".prisma/client").$Enums.DiscountType;
            value: number;
            calculatedDiscount: number;
        };
        newTotal: number;
    }>;
}
