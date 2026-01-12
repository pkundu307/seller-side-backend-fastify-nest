import { PaymentMethod, Prisma } from '@prisma/client';
export declare class CreateOrderDto {
    paymentMethod: PaymentMethod;
    selectedAddress: Prisma.JsonObject;
    cartItemIds: string[];
    shippingFee?: number;
    taxAmount?: number;
    discount?: number;
}
