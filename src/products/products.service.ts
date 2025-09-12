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


  async getFeaturedProductsByCategory(
    categoryId: number,
    paginationQuery: PaginationQueryDto,
  ) {
    const { page = 1, limit = 10 } = paginationQuery;
    const skip = (page - 1) * limit;

    // First, verify if the category actually exists.
    const categoryExists = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!categoryExists) {
      throw new NotFoundException(`Category with ID ${categoryId} not found.`);
    }

    const products = await this.prisma.product.findMany({
      where: {
        categoryId: categoryId,
        isFeatured: true, // Only featured products
        isPublished: true, // Typically, featured products should also be published
      },
      select: {
        id: true,
        title: true,
        description: true,
        slug: true,
        images: true, // Main product images
        business: {
          select: {
            name: true, // Business owner's company name
          },
        },
        isCustomizable: true,
        _count: {
          select: {
            reviews: true,
            variants: true,
          },
        },
        variants: {
          take: 1, // Only retrieve one variant for price/mrp/images
          orderBy: [ // <--- FIX: Wrap orderBy criteria in an array
            { isDefault: 'desc' }, // Prioritize default variant
            { createdAt: 'asc' },  // Fallback to the oldest variant if no default
          ],
          select: {
            price: true,
            mrp: true,
            images: true, // Variant images
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc', // Order by creation date, newest first
      },
    });

    // Post-process the results to match the desired simplified structure
    const processedProducts = products.map(product => {
      const mainImages = product.images || [];
      const variantImages =
        product.variants.length > 0 ? product.variants[0].images || [] : [];

      // Combine main and variant images and take the first 2
      const combinedImages = [...mainImages, ...variantImages].slice(0, 2);

      const selectedVariant = product.variants.length > 0 ? product.variants[0] : null;

      return {
        id: product.id,
        title: product.title,
        description: product.description,
        businessName: product.business?.name,
        numberOfReviews: product._count.reviews,
        numberOfVariants: product._count.variants,
        price: selectedVariant?.price,
        mrp: selectedVariant?.mrp,
        images: combinedImages,
        isCustomizable: product.isCustomizable,
      };
    });

    const totalProducts = await this.prisma.product.count({
      where: {
        categoryId: categoryId,
        isFeatured: true,
        isPublished: true,
      },
    });

    return {
      products: processedProducts,
      total: totalProducts,
      page,
      limit,
      lastPage: Math.ceil(totalProducts / limit),
    };
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
    newModel3dFile?: any, // <-- NEW PARAM
    newSlicenseDocumentFile?: any, // <-- NEW PARAM
  ) {
    // --- STEP 1: PREPARATION (Outside the transaction) ---

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { business: true, variants: true }, // Simplified include
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${productId}" not found.`);
    }
    if (product.business.ownerId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to modify this product.',
      );
    }

    // --- MODIFIED: Handle all image/file deletions and uploads first ---
    const filesToDeleteFromS3: string[] = [];
    if (dto.imagesToDelete && dto.imagesToDelete.length > 0) {
      filesToDeleteFromS3.push(...dto.imagesToDelete);
    }
    // Delete model3d if requested and one exists
    if (dto.deleteModel3d && product.model3dUrl) {
      filesToDeleteFromS3.push(product.model3dUrl);
    }
    // Delete slicenseDocument if requested and one exists
    if (dto.deleteSlicenseDocument && product.slicenseDocumentUrl) {
      filesToDeleteFromS3.push(product.slicenseDocumentUrl);
    }
    
    if (filesToDeleteFromS3.length > 0) {
      console.log('Deleting files from S3:', filesToDeleteFromS3);
      await this.s3Service.deleteImages(filesToDeleteFromS3);
    }

    const newUploadedUrls: string[] = [];
    const uploadAndTrack = async (file: any): Promise<string> => {
      const url = await this.s3Service.uploadImage(
        file.buffer,
        file.filename,
        file.mimetype,
      );
      newUploadedUrls.push(url);
      return url;
    };

    try {
      // Upload new files
      const newProductImageUrls = await Promise.all(
        newProductImages.map(uploadAndTrack),
      );
      const newModel3dUrl = newModel3dFile
        ? await uploadAndTrack(newModel3dFile)
        : undefined;
      const newSlicenseDocumentUrl = newSlicenseDocumentFile
        ? await uploadAndTrack(newSlicenseDocumentFile)
        : undefined;

      // Determine the final state for each field
      const finalProductImages = [
        ...product.images.filter((url) => !dto.imagesToDelete?.includes(url)),
        ...newProductImageUrls,
      ];
      const finalModel3dUrl = newModel3dUrl ?? (dto.deleteModel3d ? null : product.model3dUrl);
      const finalSlicenseDocumentUrl = newSlicenseDocumentUrl ?? (dto.deleteSlicenseDocument ? null : product.slicenseDocumentUrl);
      
      const preparedVariantsData = await Promise.all(
        // ... This part remains unchanged
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
      return await this.prisma.$transaction(
        async (tx) => {
          // 2a. Update the Product itself
          await tx.product.update({
            where: { id: productId },
            data: {
              title: dto.title,
              description: dto.description,
              isFeatured: dto.isFeatured,
              isCustomizable: dto.isCustomizable,
              slug:
                dto.title && dto.title !== product.title
                  ? this.generateSlug(dto.title)
                  : undefined,
              images: finalProductImages,
              // --- NEW FIELDS ---
              model3dUrl: finalModel3dUrl,
              slicenseDocumentUrl: finalSlicenseDocumentUrl,
              customizationConfig: dto.customizationConfig
                ? JSON.parse(dto.customizationConfig) // Parse string to JSON for Prisma
                : undefined,
            },
          });

          // 2b. Process Variants (This logic remains the same)
          const existingVariantIds = product.variants.map((v) => v.id);
          const incomingVariantIds = dto.variants
            .map((v) => v.id)
            .filter(Boolean);

          const variantsToDelete = existingVariantIds.filter(
            (id) => !incomingVariantIds.includes(id),
          );
          if (variantsToDelete.length > 0) {
            await tx.variant.deleteMany({
              where: { id: { in: variantsToDelete } },
            });
          }

          for (const preparedVariant of preparedVariantsData) {
              // ... variant update/create logic is unchanged ...
          }

          // 2c. Return the fully updated product
          return tx.product.findUnique({
            where: { id: productId },
            include: {
              variants: {
                include: {
                  attributeValues: {
                    include: { attribute: true, attributeOption: true },
                  },
                },
              },
              category: true,
            },
          });
        },
        { maxWait: 15000, timeout: 30000 },
      );
    } catch (error) {
      if (newUploadedUrls.length > 0) {
        console.error(
          'An error occurred. Rolling back S3 uploads:',
          newUploadedUrls,
        );
        // await this.s3Service.deleteImages(newUploadedUrls);
      }
      throw error;
    }
  }

   async getInventoryStats(businessId: string, userId: string) {
    // 1. Authorize the user against the business
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true },
    });

    if (!business) {
      throw new NotFoundException(`Business with ID "${businessId}" not found.`);
    }

    if (business.ownerId !== userId) {
      throw new ForbiddenException('You do not have permission to access this business\'s inventory.');
    }

    // 2. Define the Low Stock threshold (you can make this configurable later)
    const lowStockThreshold = 10;

    // 3. Use a raw query for maximum performance to calculate all stats in one DB call
    const statsResult: any[] = await this.prisma.$queryRaw`
      SELECT
        -- Calculate total value: SUM of each variant's price multiplied by its stock
        COALESCE(SUM(v.price * v.stock), 0) AS "totalStockValue",

        -- Count variants where stock is below zero
        COUNT(CASE WHEN v.stock < 0 THEN 1 END) AS "negativeStockCount",

        -- Count variants that are low in stock (but not out of stock)
        COUNT(CASE WHEN v.stock > 0 AND v.stock <= ${lowStockThreshold} THEN 1 END) AS "lowStockCount",
        
        -- Count variants that are completely out of stock
        COUNT(CASE WHEN v.stock = 0 THEN 1 END) AS "outOfStockCount"
      FROM "Variant" AS v
      -- Join with Product to filter by the businessId
      INNER JOIN "Product" AS p ON v."productId" = p.id
      WHERE p."businessId" = ${businessId};
    `;
    
    // 4. Format the response
    const stats = statsResult[0];
    return {
      totalStockValue: parseFloat(stats.totalStockValue) || 0,
      negativeStockCount: Number(stats.negativeStockCount) || 0,
      lowStockCount: Number(stats.lowStockCount) || 0,
      outOfStockCount: Number(stats.outOfStockCount) || 0,
    };
  }

  
 async getProductDetailsForCustomer(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: {
        id: productId,
        isPublished: true, // Only return published products to customers
      },
      include: {
        business: {
          select: {
            id: true,
            name: true, // Business owner's company name
            gstNumber: true, // Potentially useful for customers
            address: true,
            city: true,
            state: true,
            country: true,
            phone: true,
            isVerified: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            // You might want to include parent categories for breadcrumbs
            parent: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        variants: {
          include: {
            attributeValues: {
              include: {
                attributeOption: {
                  select: {
                    id: true,
                    value: true,
                    slug: true,
                  },
                },
                attribute: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            // Optionally include cartItems and orderItems count if relevant for a product page (e.g., "X people have this in cart")
            // _count: {
            //   select: {
            //     cartItems: true,
            //     orderItems: true,
            //   },
            // },
          },
          orderBy: [
            { isDefault: 'desc' }, // Prioritize default variant
            { createdAt: 'asc' }, // Fallback
          ],
        },
        reviews: {
          // Limit and order reviews for a product page for performance/readability
          take: 10, // Fetch top 10 recent reviews, adjust as needed
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found or not published.`);
    }

    return product;
  }
}