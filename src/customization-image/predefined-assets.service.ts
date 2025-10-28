import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class PredefinedAssetsService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
  ) {}

  // == Category Management ==
  async createCategories(dto: CreateCategoriesDto) {
    const data = dto.categoryNames.map(name => ({ categoryName: name }));
    return this.prisma.predefinedCategory.createMany({
      data,
      skipDuplicates: true, // Prevents errors if a category already exists
    });
  }

  async getAllCategories() {
    // 1. Fetch all the primary category data
    const categories = await this.prisma.predefinedCategory.findMany({
      orderBy: { categoryName: 'asc' },
      include: {
        _count: { select: { subcategories: true } },
      },
    });

    if (categories.length === 0) {
      return [];
    }

    // 2. Collect all category IDs to fetch their images in a single query
    const categoryIds = categories.map(c => c.id);

    // 3. Fetch all relevant images from the generic image table at once
    const images = await this.prisma.categoryOrSubcategoryImage.findMany({
      where: {
        categoryOrSubcategoryId: { in: categoryIds },
        type: 'category', // CRITICAL: Only fetch images of type 'category'
      },
      // Use distinct to ensure we only get one image per category ID if duplicates exist
      distinct: ['categoryOrSubcategoryId'],
    });

    // 4. Create a Map for efficient lookup (ID -> URL)
    const imageUrlMap = new Map<string, string>(
      images.map(image => [image.categoryOrSubcategoryId, image.url])
    );

    // 5. Combine the category data with its corresponding image URL
    const categoriesWithImages = categories.map(category => ({
      ...category,
      imageUrl: imageUrlMap.get(category.id) || null, // Attach the URL or null if no image is found
    }));

    return categoriesWithImages;
  }
  // == SubCategory Management ==
  async createSubCategories(dto: CreateSubCategoriesDto) {
    // 1. Verify parent category exists
    const parentCategory = await this.prisma.predefinedCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!parentCategory) {
      throw new NotFoundException(`Parent category with ID "${dto.categoryId}" not found.`);
    }

    // 2. Prepare data and create
    const data = dto.subCategoryNames.map(name => ({
      subCategoryName: name,
      categoryId: dto.categoryId,
    }));
    return this.prisma.predefinedSubCategory.createMany({
      data,
      skipDuplicates: true,
    });
  }

  async getSubCategoriesByCategoryId(categoryId: string) {
    // 1. Fetch all the primary subcategory data
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

    // 2. Collect all subcategory IDs for the second query
    const subCategoryIds = subcategories.map(s => s.id);

    // 3. Fetch all relevant images from the generic image table at once
    const images = await this.prisma.categoryOrSubcategoryImage.findMany({
      where: {
        categoryOrSubcategoryId: { in: subCategoryIds },
        type: 'subcategory', // CRITICAL: Only fetch images of type 'subcategory'
      },
      distinct: ['categoryOrSubcategoryId'],
    });

    // 4. Create a Map for efficient lookup
    const imageUrlMap = new Map<string, string>(
      images.map(image => [image.categoryOrSubcategoryId, image.url])
    );

    // 5. Combine the subcategory data with its corresponding image URL
    const subcategoriesWithImages = subcategories.map(subcategory => ({
      ...subcategory,
      imageUrl: imageUrlMap.get(subcategory.id) || null,
    }));

    return subcategoriesWithImages;
  }

  // == SubCategory Image Management ==
  async addImagesToSubCategory(dto: AddSubCategoryImagesDto, files?: UploadedFile[]) {
    const imageUrlsFromString = dto.imageUrls ? JSON.parse(dto.imageUrls) : [];

    if (imageUrlsFromString.length > 0 && files && files.length > 0) {
      throw new BadRequestException('Provide either imageUrls or imageFiles, but not both.');
    }
    if (imageUrlsFromString.length === 0 && (!files || files.length === 0)) {
      throw new BadRequestException('You must provide at least one image URL or upload at least one file.');
    }

    // 1. Verify parent subcategory exists
    const parentSubCategory = await this.prisma.predefinedSubCategory.findUnique({
      where: { id: dto.subCategoryId },
    });
    if (!parentSubCategory) {
      throw new NotFoundException(`Subcategory with ID "${dto.subCategoryId}" not found.`);
    }

    let finalImageUrls: string[] = [];
    const uploadedUrlsForRollback: string[] = [];

    try {
      if (files && files.length > 0) {
        // Upload files to S3 in parallel for efficiency
        const uploadPromises = files.map(file =>
          this.s3Service.uploadImage(file.buffer, file.filename, file.mimetype),
        );
        finalImageUrls = await Promise.all(uploadPromises);
        uploadedUrlsForRollback.push(...finalImageUrls);
      } else {
        finalImageUrls = imageUrlsFromString;
      }

      // 2. Prepare data for batch database insertion
      const dbPayload = finalImageUrls.map(url => ({
        subCategoryId: dto.subCategoryId,
        url,
      }));

      // 3. Create all image records in a single transaction
      const result = await this.prisma.subCategoryImage.createMany({ data: dbPayload });

      return { success: true, count: result.count };
    } catch (error) {
      // 4. CRITICAL: If anything fails, rollback S3 uploads
      if (uploadedUrlsForRollback.length > 0) {
        console.error('Operation failed. Rolling back S3 uploads:', uploadedUrlsForRollback);
        await this.s3Service.deleteImages(uploadedUrlsForRollback);
      }
      throw error; // Propagate the error
    }
  }

  async getImagesBySubCategoryId(subCategoryId: string) {
    return this.prisma.subCategoryImage.findMany({
      where: { subCategoryId },
      orderBy: { createdAt: 'desc' },
    });
  }
}