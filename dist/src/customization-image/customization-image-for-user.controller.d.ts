import { ValidationPipe } from '@nestjs/common';
import { PredefinedAssetsService } from './predefined-assets.service';
export declare class UserPredefinedAssetsController {
    private readonly assetsService;
    private readonly validationPipe;
    constructor(assetsService: PredefinedAssetsService, validationPipe: ValidationPipe);
    getAllCategories(): Promise<{
        imageUrl: string | null;
        imageId: string | null;
        _count: {
            subcategories: number;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        categoryName: string;
    }[]>;
    getSubCategoriesByCategoryId(categoryId: string): Promise<{
        imageUrl: string | null;
        imageId: string | null;
        _count: {
            images: number;
        };
        id: string;
        createdAt: Date;
        categoryId: string;
        updatedAt: Date;
        subCategoryName: string;
    }[]>;
    getImagesBySubCategoryId(subCategoryId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        subCategoryId: string;
        url: string;
    }[]>;
    private parseMultipartRequest;
}
