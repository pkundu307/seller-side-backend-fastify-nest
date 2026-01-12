export declare class CreateCouponDto {
    code: string;
    discountId: string;
    active?: boolean;
    maxUses?: number;
    perUserLimit?: number;
    startsAt?: Date;
    expiresAt?: Date;
}
