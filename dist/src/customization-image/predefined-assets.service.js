"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PredefinedAssetsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const s3Service_1 = require("../products/utils/s3Service");
let PredefinedAssetsService = class PredefinedAssetsService {
    prisma;
    s3Service;
    constructor(prisma, s3Service) {
        this.prisma = prisma;
        this.s3Service = s3Service;
    }
    async createCategories(dto) {
        const data = dto.categoryNames.map(name => ({ categoryName: name }));
        return this.prisma.predefinedCategory.createMany({
            data,
            skipDuplicates: true,
        });
    }
    async getAllCategories() {
        const categories = await this.prisma.predefinedCategory.findMany({
            orderBy: { categoryName: 'asc' },
            include: {
                _count: { select: { subcategories: true } },
            },
        });
        if (categories.length === 0) {
            return [];
        }
        const categoryIds = categories.map(c => c.id);
        const images = await this.prisma.categoryOrSubcategoryImage.findMany({
            where: {
                categoryOrSubcategoryId: { in: categoryIds },
                type: 'category',
            },
            distinct: ['categoryOrSubcategoryId'],
        });
        const imageInfoMap = new Map(images.map(image => [
            image.categoryOrSubcategoryId,
            { id: image.id, url: image.url },
        ]));
        const categoriesWithImages = categories.map(category => {
            const imageInfo = imageInfoMap.get(category.id);
            return {
                ...category,
                imageUrl: imageInfo?.url || null,
                imageId: imageInfo?.id || null,
            };
        });
        return categoriesWithImages;
    }
    async createSubCategories(dto) {
        const parentCategory = await this.prisma.predefinedCategory.findUnique({
            where: { id: dto.categoryId },
        });
        if (!parentCategory) {
            throw new common_1.NotFoundException(`Parent category with ID "${dto.categoryId}" not found.`);
        }
        const data = dto.subCategoryNames.map(name => ({
            subCategoryName: name,
            categoryId: dto.categoryId,
        }));
        return this.prisma.predefinedSubCategory.createMany({
            data,
            skipDuplicates: true,
        });
    }
    async getSubCategoriesByCategoryId(categoryId) {
        const subcategories = await this.prisma.predefinedSubCategory.findMany({
            where: { categoryId },
            orderBy: { subCategoryName: 'asc' },
            include: {
                _count: { select: { images: true } },
            },
        });
        if (subcategories.length === 0) {
            return [];
        }
        const subCategoryIds = subcategories.map(s => s.id);
        const images = await this.prisma.categoryOrSubcategoryImage.findMany({
            where: {
                categoryOrSubcategoryId: { in: subCategoryIds },
                type: 'subcategory',
            },
            distinct: ['categoryOrSubcategoryId'],
        });
        const imageInfoMap = new Map(images.map(image => [
            image.categoryOrSubcategoryId,
            { id: image.id, url: image.url },
        ]));
        const subcategoriesWithImages = subcategories.map(subcategory => {
            const imageInfo = imageInfoMap.get(subcategory.id);
            return {
                ...subcategory,
                imageUrl: imageInfo?.url || null,
                imageId: imageInfo?.id || null,
            };
        });
        return subcategoriesWithImages;
    }
    async addImagesToSubCategory(dto, files) {
        const imageUrlsFromString = dto.imageUrls ? JSON.parse(dto.imageUrls) : [];
        if (imageUrlsFromString.length > 0 && files && files.length > 0) {
            throw new common_1.BadRequestException('Provide either imageUrls or imageFiles, but not both.');
        }
        if (imageUrlsFromString.length === 0 && (!files || files.length === 0)) {
            throw new common_1.BadRequestException('You must provide at least one image URL or upload at least one file.');
        }
        const parentSubCategory = await this.prisma.predefinedSubCategory.findUnique({
            where: { id: dto.subCategoryId },
        });
        if (!parentSubCategory) {
            throw new common_1.NotFoundException(`Subcategory with ID "${dto.subCategoryId}" not found.`);
        }
        let finalImageUrls = [];
        const uploadedUrlsForRollback = [];
        try {
            if (files && files.length > 0) {
                const uploadPromises = files.map(file => this.s3Service.uploadImage(file.buffer, file.filename, file.mimetype, "assets"));
                finalImageUrls = await Promise.all(uploadPromises);
                uploadedUrlsForRollback.push(...finalImageUrls);
            }
            else {
                finalImageUrls = imageUrlsFromString;
            }
            const dbPayload = finalImageUrls.map(url => ({
                subCategoryId: dto.subCategoryId,
                url,
            }));
            const result = await this.prisma.subCategoryImage.createMany({ data: dbPayload });
            return { success: true, count: result.count };
        }
        catch (error) {
            if (uploadedUrlsForRollback.length > 0) {
                console.error('Operation failed. Rolling back S3 uploads:', uploadedUrlsForRollback);
                await this.s3Service.deleteImages(uploadedUrlsForRollback);
            }
            throw error;
        }
    }
    async getImagesBySubCategoryId(subCategoryId) {
        return this.prisma.subCategoryImage.findMany({
            where: { subCategoryId },
            orderBy: { createdAt: 'desc' },
        });
    }
};
exports.PredefinedAssetsService = PredefinedAssetsService;
exports.PredefinedAssetsService = PredefinedAssetsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        s3Service_1.S3Service])
], PredefinedAssetsService);
//# sourceMappingURL=predefined-assets.service.js.map