import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../products/utils/s3Service';
import { AddGenericImagesDto } from './dto/create-generic-image.dto';


export interface UploadedFile {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}

@Injectable()
export class GenericImageService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
  ) {}

  /**
   * Adds multiple images for a category/subcategory, either from uploaded files or direct URLs.
   * This is a batch "add" operation; it does not replace existing images.
   */
  async addImages(dto: AddGenericImagesDto, files?: UploadedFile[]) {
    const imageUrlsFromString = dto.imageUrls ? JSON.parse(dto.imageUrls) : [];
    
    // 1. Validate input: Ensure exactly one source of images is provided.
    if (imageUrlsFromString.length > 0 && files && files.length > 0) {
      throw new BadRequestException('Provide either imageUrls or imageFiles, but not both.');
    }
    if (imageUrlsFromString.length === 0 && (!files || files.length === 0)) {
      throw new BadRequestException('You must provide at least one image URL or upload at least one file.');
    }

    let finalImageUrls: string[] = [];
    const uploadedUrlsForRollback: string[] = [];

    try {
      if (files && files.length > 0) {
        // --- PATH 1: Upload files to S3 in parallel ---
        const uploadPromises = files.map(file => 
          this.s3Service.uploadImage(file.buffer, file.filename, file.mimetype,"assets")
        );
        finalImageUrls = await Promise.all(uploadPromises);
        uploadedUrlsForRollback.push(...finalImageUrls);
      } else {
        // --- PATH 2: Use URLs provided directly ---
        // Optional: Add validation here to ensure URLs are well-formed if needed
        finalImageUrls = imageUrlsFromString;
      }

      // 2. Prepare data for database insertion
      const dbPayload = finalImageUrls.map(url => ({
        categoryOrSubcategoryId: dto.categoryOrSubcategoryId,
        type: dto.type,
        url: url,
      }));

      // 3. Perform a batch create in the database
      const result = await this.prisma.categoryOrSubcategoryImage.createMany({
        data: dbPayload,
      });

      return {
        success: true,
        message: `${result.count} images added successfully.`,
        count: result.count,
      };
    } catch (error) {
      // 4. CRITICAL: If any error occurred (S3 or DB), roll back S3 uploads.
      if (uploadedUrlsForRollback.length > 0) {
        console.error('Operation failed. Rolling back S3 uploads:', uploadedUrlsForRollback);
        await this.s3Service.deleteImages(uploadedUrlsForRollback);
      }
      // Re-throw the original error to be handled by NestJS
      throw error;
    }
  }

  // The deleteImage method remains unchanged as it operates on a single ID
  async deleteImage(id: string) {
    const image = await this.prisma.categoryOrSubcategoryImage.findUnique({
      where: { id },
    });

    if (!image) {
      throw new NotFoundException(`Image with ID "${id}" not found.`);
    }

    await this.prisma.categoryOrSubcategoryImage.delete({ where: { id } });

    // Optional: Check if the URL belongs to your S3 before deleting to avoid errors with external URLs
    if (image.url.includes('.s3.')) {
        try {
            await this.s3Service.deleteImages([image.url]);
        } catch (s3Error) {
            console.error(
                `Successfully deleted image ID ${id} from DB, but failed to delete S3 object.`,
                { url: image.url, error: s3Error },
            );
        }
    }

    return { success: true, message: 'Image deleted successfully.' };
  }
}