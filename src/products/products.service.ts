// src/products/products.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from './utils/s3Service';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service
  ) {}

  async findBusinessById(businessId: string) {
    console.log(businessId,'lll');
    
    return this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, ownerId: true, name: true }
    });
  }

  async createProduct(businessId: string, formData: any) {
    try {
      // Upload images to S3
      const imageUrls: string[] = [];
      for (const image of formData.images) {
        const imageUrl = await this.s3Service.uploadImage(
          image.buffer,
          image.filename,
          image.mimetype
        );
        imageUrls.push(imageUrl);
      }

      // Generate slug from title
      const slug = this.generateSlug(formData.title);
console.log(formData);

      // Create product in database
      const product = await this.prisma.product.create({
        data: {
          title: formData.title,
          description: formData.description,
          price: formData.price,
          itemCategory: formData.itemCategory,
          itemType: formData.itemType,
          mrp: formData.mrp,
          discountAmount: formData.discountAmount,
          images: imageUrls,
          slug: slug,
          businessId: businessId,
          isPublished: false // Default to unpublished
        },
        include: {
          business: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      return {
        success: true,
        message: 'Product created successfully',
        data: product
      };
    } catch (error) {
      if (error.code === 'P2002' && error.meta?.target?.includes('slug')) {
        throw new BadRequestException('Product with this title already exists');
      }
      throw error;
    }
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();
  }

  async getAllProducts() {
    return {p:"khk"}
    
    // this.prisma.product.findMany({
    //   include: {
    //     business: {
    //       select: {
    //         id: true,
    //         name: true
    //       }
    //     }
    //   }
    // });
  }
}
