declare class UpdateVariantAttributeDto {
    attributeId: number;
    attributeOptionId: number;
}
declare class UpdateVariantDto {
    id?: string;
    sku: string;
    price: number;
    mrp: number;
    stock: number;
    status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
    attributeValues: UpdateVariantAttributeDto[];
    images: string[];
}
export declare class UpdateProductDto {
    title?: string;
    description?: string;
    isFeatured?: boolean;
    isCustomizable?: boolean;
    variants: UpdateVariantDto[];
    imagesToDelete?: string[];
    customizationConfig?: string;
    deleteModel3d?: boolean;
    deleteSlicenseDocument?: boolean;
}
export {};
