declare class PosSaleItemDto {
    variantId: string;
    quantity: number;
}
export declare class CreatePosSaleDto {
    customerName?: string;
    customerPhone?: string;
    items: PosSaleItemDto[];
}
export {};
