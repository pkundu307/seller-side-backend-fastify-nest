// src/products/products.service.ts
import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from './utils/s3Service';
import { PaginationQueryDto } from './dto/pagination-query.dto';

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

  if (!Array.isArray(formData.variants) || formData.variants.length === 0) {
        throw new BadRequestException('At least one variant is required.');
      }
      const variantDataForDb = formData.variants.map((variant: any) => {
        const price = parseFloat(variant.price);
        const stock = parseInt(variant.stock, 10);

        // Add robust validation for numeric conversion
        if (isNaN(price) || isNaN(stock)) {
          throw new BadRequestException(`Invalid numeric value for variant price or stock. Received price: "${variant.price}", stock: "${variant.stock}"`);
        }

        return {
          size: variant.size,
          color: variant.color,
          price: price, // Now a number
          stock: stock,   // Now a number
        };
      });

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
          isPublished: false, // Default to unpublished
          variants: {
            create: variantDataForDb, // Pass the prepared variant data here
          }
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

  async getProductsByBusiness(businessId: string, paginationQuery: PaginationQueryDto,userId: string) {
    const { page = 1, limit = 10 } = paginationQuery;
    const skip = Number(page - 1) * limit;

    // Check if business exists to give a clear error
    const businessExists = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
  const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, ownerId: true }, // <-- SELECT ownerId FOR THE CHECK
    });

    if (!business) {
      throw new NotFoundException(`Business with ID "${businessId}" not found`);
    }

    if (business.ownerId !== userId) {
      // This is a 403 Forbidden error. The user is authenticated, 
      // but not authorized to view this specific resource.
      throw new ForbiddenException('You do not have permission to access products for this business.');
    }
console.log(businessId,'businessId');

    // Use a transaction to get both data and total count efficiently
    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where: {
          businessId: businessId,
          // isPublished: true, // Only show published products to the public
        },
        select: { // Select only the necessary fields for a list view
          id: true,
          title: true,
          price: true,
          images: true,
          slug: true,
          isFeatured: true,
          itemCategory: true,
        },
        skip: skip,
        take: Number(limit),
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.product.count({
        where: {
          businessId: businessId,
          isPublished: true,
        },
      }),
    ]);
    console.log(products,'products');
    
    
    const totalPages = Math.ceil(total / limit);

    return {
      data: products,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async getProductByIdForBusiness(businessId: string, productId: string,userId:string) {
    // The where clause ensures we fetch the product only if it belongs to the specified business
    const product = await this.prisma.product.findUnique({
      where: {
        id: productId,
        businessId: businessId,
      },
      include: { // Include related data for the detailed view
        variants: true,
        business: {
          select: {
            id: true,
            name: true,
          },
        },
        // Optionally include reviews if needed
        // reviews: {
        //   orderBy: { createdAt: 'desc' },
        //   take: 5 // Example: get latest 5 reviews
        // }
      },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with ID "${productId}" not found or does not belong to business "${businessId}"`
      );
    }

    return product;
  }
}
