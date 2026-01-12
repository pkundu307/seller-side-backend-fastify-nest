import { ValidationPipe } from '@nestjs/common';
import { PredefinedAssetsService } from './predefined-assets.service';
import { FastifyRequest } from 'fastify';
import { CreateCategoriesDto } from './dto/create-categories.dto';
import { CreateSubCategoriesDto } from './dto/create-subcategories.dto';
export declare class PredefinedAssetsController {
    private readonly assetsService;
    private readonly validationPipe;
    constructor(assetsService: PredefinedAssetsService, validationPipe: ValidationPipe);
    createCategories(dto: CreateCategoriesDto): Promise<import(".prisma/client").Prisma.BatchPayload>;
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
    createSubCategories(dto: CreateSubCategoriesDto): Promise<import(".prisma/client").Prisma.BatchPayload>;
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
    addImagesToSubCategory(req: FastifyRequest): Promise<{
        success: boolean;
        count: number;
    }>;
    getImagesBySubCategoryId(subCategoryId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        subCategoryId: string;
        url: string;
    }[]>;
    private parseMultipartRequest;
}
