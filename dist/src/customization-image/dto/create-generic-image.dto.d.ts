export declare enum ImageType {
    CATEGORY = "category",
    SUBCATEGORY = "subcategory"
}
export declare class AddGenericImagesDto {
    categoryOrSubcategoryId: string;
    type: ImageType;
    imageUrls?: string;
}
