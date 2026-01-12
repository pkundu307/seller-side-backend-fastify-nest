declare class CreateVariantAttributeDto {
    attributeOptionId: string;
}
declare class CreateVariantDto {
    sku: string;
    price: string;
    stock: string;
    mrp?: string;
    hsnCode?: string;
    attributes: CreateVariantAttributeDto[];
}
export declare class CreateProductDto {
    title: string;
    categoryId: string;
    description: string;
    variants: CreateVariantDto[];
}
export {};
