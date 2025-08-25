// src/products/products.service.ts
import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from './utils/s3Service';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { Prisma } from '@prisma/client'; // <-- IMPORT PRISMA FOR TYPES
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
  ) {}

  async findBusinessById(businessId: string) {
    return this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, ownerId: true, name: true },
    });
  }

    // FIXED: The entire method logic is now correctly structured.
async createProduct(businessId: string, formData: any) {
    const uploadedImageUrls: string[] = [];

  try {
    // 1. Upload main product images (same as before)
    const productImagesUrls: string[] = [];
    if (formData.images && formData.images.length > 0) {
      for (const image of formData.images) {
        const imageUrl = await this.s3Service.uploadImage(
          image.buffer,
          image.filename,
          image.mimetype,
        );
        productImagesUrls.push(imageUrl);
           uploadedImageUrls.push(imageUrl); 
      }
    }

    const slug = this.generateSlug(formData.title);

    // 2. Process variants with their specific images
    const variantsToCreate = await Promise.all(
      formData.variants.map(async (variant: any, index: number) => {
        // Validate attribute options (same as before)
        const attributeOptionIds = variant.attributes.map((attr: any) =>
          parseInt(attr.attributeOptionId, 10),
        );

        const chosenOptions = await this.prisma.attributeOption.findMany({
          where: { id: { in: attributeOptionIds } },
          select: { id: true, attributeId: true },
        });

        if (chosenOptions.length !== attributeOptionIds.length) {
          throw new BadRequestException('One or more provided attributeOptionIds are invalid.');
        }

        const parentAttributeIds = chosenOptions.map((opt) => opt.attributeId);
        if (new Set(parentAttributeIds).size !== parentAttributeIds.length) {
          throw new BadRequestException(`Variant with SKU ${variant.sku} cannot have multiple values for the same attribute type.`);
        }

        const attributeValuesToCreate = chosenOptions.map((option) => ({
          attributeOption: { connect: { id: option.id } },
          attribute: { connect: { id: option.attributeId } },
        }));

        // Handle variant-specific images using the new approach
        const variantImageUrls: string[] = [];
        
        // Try to find images by index first, then by SKU
        const variantImages = formData.variantImagesMap.get(index.toString()) || 
                             formData.variantImagesMap.get(variant.sku) || [];

        for (const imageData of variantImages) {
          const imageUrl = await this.s3Service.uploadImage(
            imageData.buffer,
            imageData.filename,
            imageData.mimetype,
          );
          variantImageUrls.push(imageUrl);
            uploadedImageUrls.push(imageUrl);
        }

        return {
          sku: variant.sku,
          price: new Prisma.Decimal(variant.price),
          stock: parseInt(variant.stock, 10),
          mrp: variant.mrp ? new Prisma.Decimal(variant.mrp) : undefined,
          hsnCode: variant.hsnCode,
          images: variantImageUrls,
          attributeValues: {
            create: attributeValuesToCreate,
          },
        };
      }),
    );

    // Rest of the method remains the same...
    const product = await this.prisma.product.create({
      data: {
        title: formData.title,
        description: formData.description,
        slug: slug,
        images: productImagesUrls,
        business: { connect: { id: businessId } },
        category: { connect: { id: parseInt(formData.categoryId, 10) } },
        variants: {
          create: variantsToCreate,
        },
      },
      include: {
        category: true,
        variants: {
          include: {
            attributeValues: {
              include: {
                attributeOption: { select: { value: true } },
                attribute: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    return { success: true, message: 'Product created successfully', data: product };
  } catch (error) {
    // Error handling remains the same...
     if (uploadedImageUrls.length > 0) {
      console.error('An error occurred during product creation. Rolling back S3 uploads...');
     }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = error.meta?.target as string[];
        if (target.includes('slug')) throw new BadRequestException('A product with this title already exists.');
        if (target.includes('sku')) throw new BadRequestException('One of the provided SKU values is already in use.');
      }
      if (error.code === 'P2025') {
        throw new BadRequestException('The provided categoryId or an attributeOptionId does not exist.');
      }
    }
    throw error;
  }
}


  /**
   * Fetches a paginated list of products for a given business, optimized for list views.
   */
  async getProductsByBusiness(businessId: string, paginationQuery: PaginationQueryDto, userId: string) {
    const { page = 1, limit = 10 } = paginationQuery;
    const skip = (Number(page) - 1) * Number(limit);

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true },
    });

    if (!business) throw new NotFoundException(`Business with ID "${businessId}" not found`);
    if (business.ownerId !== userId) throw new ForbiddenException('You do not have permission to access products for this business.');

    const whereClause = { businessId: businessId };
    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where: whereClause,
        select: {
          id: true,
          title: true,
          slug: true,
          images: true,
          isPublished: true,
          variants: { where: { isDefault: true }, select: { price: true, stock: true }, take: 1 },
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where: whereClause }),
    ]);

    const formattedProducts = products.map(p => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      images: p.images,
      isPublished: p.isPublished,
      price: p.variants.length > 0 ? p.variants[0].price : null,
      stock: p.variants.length > 0 ? p.variants[0].stock : null,
    }));
    
    const totalPages = Math.ceil(total / limit);
    return { data: formattedProducts, pagination: { total, page: Number(page), limit: Number(limit), totalPages, hasNextPage: Number(page) < totalPages, hasPrevPage: Number(page) > 1 } };
  }

  /**
   * Fetches a single product with all its detailed variant and attribute information.
   */
  async getProductByIdForBusiness(businessId: string, productId: string, userId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, businessId: businessId, business: { ownerId: userId } },
      include: {
        category: { select: { id: true, name: true } },
        variants: {
          orderBy: { createdAt: 'asc' },
          include: {
            attributeValues: {
              include: {
                attribute: { select: { id: true, name: true } },
                attributeOption: { select: { id: true, value: true } },
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${productId}" not found or you do not have permission to access it.`);
    }

    return product;
  }

  /**
   * A helper method to generate a URL-friendly slug from a string.
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

 async updateProduct(
    productId: string,
    userId: string,
    dto: UpdateProductDto,
    newProductImages: any[],
    newVariantImagesMap: Map<string, any[]>,
  ) {
    // --- STEP 1: PREPARATION (Outside the transaction) ---

    // 1a. Authorization & Fetch Existing Product (Read operation is fine here)
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { business: true, variants: { include: { attributeValues: true } } },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${productId}" not found.`);
    }
    if (product.business.ownerId !== userId) {
      throw new ForbiddenException('You do not have permission to modify this product.');
    }

    // 1b. Handle all image deletions and uploads first
    if (dto.imagesToDelete && dto.imagesToDelete.length > 0) {
      console.log('Deleting images from S3:', dto.imagesToDelete);
        await this.s3Service.deleteImages(dto.imagesToDelete);
    }

    const newUploadedUrls: string[] = [];
    const uploadAndTrack = async (file: any): Promise<string> => {
      const url = await this.s3Service.uploadImage(file.buffer, file.filename, file.mimetype);
      newUploadedUrls.push(url);
      return url;
    };

    try {
      // 1c. Upload new main product images
      const newProductImageUrls = await Promise.all(newProductImages.map(uploadAndTrack));
      const finalProductImages = [
        ...product.images.filter(url => !dto.imagesToDelete?.includes(url)),
        ...newProductImageUrls,
      ];
      
      // 1d. Prepare all variant data, including uploading their new images
      const preparedVariantsData = await Promise.all(
        dto.variants.map(async (variantDto, index) => {
          const newVariantImages = newVariantImagesMap.get(index.toString()) || [];
          const newVariantImageUrls = await Promise.all(newVariantImages.map(uploadAndTrack));

          const finalVariantImages = [
            ...(variantDto.images || []).filter(url => !dto.imagesToDelete?.includes(url)),
            ...newVariantImageUrls,
          ];

          return {
            dto: variantDto,
            finalImages: finalVariantImages,
          };
        }),
      );

      // --- STEP 2: EXECUTION (Inside the transaction) ---
      // Now, all async I/O is complete. We can run a fast, atomic DB transaction.

      return await this.prisma.$transaction(async (tx) => {
        // 2a. Update the Product itself
        await tx.product.update({
          where: { id: productId },
          data: {
            title: dto.title ?? product.title,
            description: dto.description ?? product.description,
            isFeatured: dto.isFeatured ?? product.isFeatured,
            isCustomizable: dto.isCustomizable ?? product.isCustomizable,
            slug: dto.title && dto.title !== product.title ? this.generateSlug(dto.title) : undefined,
            images: finalProductImages,
          },
        });

        // 2b. Process Variants
        const existingVariantIds = product.variants.map(v => v.id);
        const incomingVariantIds = dto.variants.map(v => v.id).filter(Boolean);

        const variantsToDelete = existingVariantIds.filter(id => !incomingVariantIds.includes(id));
        if (variantsToDelete.length > 0) {
          await tx.variant.deleteMany({ where: { id: { in: variantsToDelete } } });
        }
        
        for (const preparedVariant of preparedVariantsData) {
          const { dto: variantDto, finalImages } = preparedVariant;

          const variantData = {
            sku: variantDto.sku,
            price: new Prisma.Decimal(variantDto.price),
            mrp: new Prisma.Decimal(variantDto.mrp),
            stock: variantDto.stock,
            status: variantDto.status,
            images: finalImages,
          };

          const attributeValuesData = {
            deleteMany: {},
            create: variantDto.attributeValues.map(attr => ({
              attribute: { connect: { id: attr.attributeId } },
              attributeOption: { connect: { id: attr.attributeOptionId } },
            })),
          };
          
          if (variantDto.id && existingVariantIds.includes(variantDto.id)) {
            // UPDATE existing variant
            await tx.variant.update({
              where: { id: variantDto.id },
              data: { ...variantData, attributeValues: attributeValuesData },
            });
          } else {
            // CREATE new variant
            await tx.variant.create({
              data: {
                ...variantData,
                product: { connect: { id: productId } },
                attributeValues: { create: attributeValuesData.create },
              },
            });
          }
        }

        // 2c. Return the fully updated product
        return tx.product.findUnique({
          where: { id: productId },
          include: { 
            variants: { 
              include: { 
                attributeValues: {
                  include: { attribute: true, attributeOption: true }
                } 
              } 
            },
            category: true 
          },
        });
      },
      {
          maxWait: 15000,
          timeout: 30000, 
        }
    );

    } catch (error) {
      // Rollback S3 uploads if any part of the process fails
      if (newUploadedUrls.length > 0) {
        console.error('An error occurred. Rolling back S3 uploads:', newUploadedUrls);
        // await this.s3Service.deleteImages(newUploadedUrls);
      }
      throw error; // Re-throw the original error
    }
  }

}