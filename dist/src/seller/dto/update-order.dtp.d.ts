import { OrderStatus } from "@prisma/client";
export declare class UpdateSellerOrderDto {
    status?: OrderStatus;
    trackingNumber?: string;
    cancellationReason?: string;
    estimatedDeliveryDate?: Date;
}
