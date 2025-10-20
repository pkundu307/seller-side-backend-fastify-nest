import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../products/utils/s3Service'; // Adjust path if needed
import { CreateCustomizationImageDto } from './dto/create-customization-image.dto';

// Interface for the parsed file from the controller
export interface UploadedFile {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}

@Injectable()
export class CustomizationImageService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
  ) {}

  /**
   * Creates a new predefined image from either an uploaded file or a provided URL.
   */
  async create(dto: CreateCustomizationImageDto, file?: UploadedFile) {
    if (!dto.url && !file) {
      throw new BadRequestException('You must provide either an image URL or upload an image file.');
    }
    if (dto.url && file) {
      throw new BadRequestException('You cannot provide both an image URL and an image file.');
    }

    let imageUrl: string = '';
    let s3UploadSucceeded = false;

    try {
      if (file) {
        imageUrl = await this.s3Service.uploadImage(file.buffer, file.filename, file.mimetype);
        s3UploadSucceeded = true;
      } else {
        imageUrl = dto.url||'';

      }

      const newImage = await this.prisma.predefinedImageForCustomization.create({
        data: {
          category: dto.category,
          subCategory: dto.subCategory,
          url: imageUrl,
        },
      });

      return newImage;
    } catch (error) {
      // Rollback S3 upload if the database insert fails
      if (s3UploadSucceeded) {
        console.error('Database error after S3 upload. Rolling back S3 object:', imageUrl);
        await this.s3Service.deleteImages([imageUrl]);
      }
      throw error;
    }
  }

  /**
   * Updates the active status of a predefined image.
   */
  async updateActiveState(id: string, active: boolean) {
    const image = await this.prisma.predefinedImageForCustomization.findUnique({ where: { id } });
    if (!image) {
      throw new NotFoundException(`Image with ID "${id}" not found.`);
    }

    return this.prisma.predefinedImageForCustomization.update({
      where: { id },
      data: { active },
    });
  }

  /**
   * Deletes a predefined image and its corresponding S3 object if it exists.
   */
  async delete(id: string) {
    const image = await this.prisma.predefinedImageForCustomization.findUnique({ where: { id } });
    if (!image) {
      throw new NotFoundException(`Image with ID "${id}" not found.`);
    }

    // Delete from database first
    await this.prisma.predefinedImageForCustomization.delete({ where: { id } });

    // Check if the URL points to our S3 bucket before trying to delete
    // You should store your S3 base URL/bucket name in env variables
    const s3BaseUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com`;
    if (image.url.startsWith(s3BaseUrl)) {
      try {
        await this.s3Service.deleteImages([image.url]);
      } catch (s3Error) {
        console.error(`Successfully deleted image ID ${id} from DB, but failed to delete S3 object.`, {
          url: image.url,
          error: s3Error,
        });
      }
    }

    return { success: true, message: 'Image deleted successfully.' };
  }

  /**
   * Gets a unique list of all categories.
   */
  async getCategories() {
    const results = await this.prisma.predefinedImageForCustomization.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    return results.map(item => item.category);
  }

  /**
   * Gets a unique list of sub-categories for a given category.
   */
  async getSubCategories(category: string) {
    const results = await this.prisma.predefinedImageForCustomization.findMany({
      where: { category },
      select: { subCategory: true },
      distinct: ['subCategory'],
      orderBy: { subCategory: 'asc' },
    });
    return results.map(item => item.subCategory);
  }

  /**
   * Gets all active images for a given sub-category.
   */
  async getImagesBySubCategory(category: string, subCategory: string) {
    return this.prisma.predefinedImageForCustomization.findMany({
      where: {
        category,
        subCategory,
        active: true, // Only return active images for general fetching
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}