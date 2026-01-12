declare class OrderItemDto {
    variantId: string;
    quantity: number;
}
export declare class CreatePaymentInitiationDto {
    items: OrderItemDto[];
    couponCode?: string;
}
export {};
