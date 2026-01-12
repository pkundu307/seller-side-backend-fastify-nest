import { OrderStatus, PaymentMethod } from '@prisma/client';
export declare class SellerPaginationDto {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    paymentMethod?: PaymentMethod;
    search?: string;
}
