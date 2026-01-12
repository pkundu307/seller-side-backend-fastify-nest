import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../products/utils/s3Service';
import { CreateCategoriesDto } from './dto/create-categories.dto';
import { CreateSubCategoriesDto } from './dto/create-subcategories.dto';
import { AddSubCategoryImagesDto } from './dto/add-subcategory-images.dto';
export interface UploadedFile {
    buffer: Buffer;
    filename: string;
    mimetype: string;
}
export declare class PredefinedAssetsService {
    private prisma;
    private s3Service;
    constructor(prisma: PrismaService, s3Service: S3Service);
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
    addImagesToSubCategory(dto: AddSubCategoryImagesDto, files?: UploadedFile[]): Promise<{
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
}
