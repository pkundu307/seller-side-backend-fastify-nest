// src/products/products.service.ts
import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from './utils/s3Service';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { Prisma } from '@prisma/client'; // <-- IMPORT PRISMA FOR TYPES
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductPaginationDto } from './dto/product-pagination.dto';

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

    // 1. Find the category and determine if it's a parent
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: { children: { select: { id: true, name: true, slug: true } } },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found.`);
    }

    const isParentCategory = category.children.length > 0;

    // --- CASE 1: IT'S A PARENT CATEGORY ---
    if (isParentCategory) {
      // For each child category, fetch up to 5 featured products.
      const childrenWithProducts = await Promise.all(
        category.children.map(async (child) => {
          const products = await this.prisma.product.findMany({
            where: {
              categoryId: child.id,
              isFeatured: true,
              isPublished: true,
            },
            take: 5, // Fetch 5 products per child category
            orderBy: { createdAt: 'desc' },
            select: this.getFeaturedProductSelect(), // Use a reusable select object
          });

          return {
            ...child,
            products: products.map(this.processProduct), // Process each product
          };
        })
      );

      return {
        type: 'parent_category',
        category: { id: category.id, name: category.name, slug: category.slug },
        children: childrenWithProducts,
      };
    }

    // --- CASE 2: IT'S A CHILD CATEGORY (or a category with no children) ---
    else {
      const allCategoryIds = await this.getCategoryAndAllChildrenIds(categoryId);

      const products = await this.prisma.product.findMany({
        where: {
          categoryId: { in: allCategoryIds },
          isFeatured: true,
          isPublished: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: this.getFeaturedProductSelect(),
      });

      const totalProducts = await this.prisma.product.count({
        where: {
          categoryId: { in: allCategoryIds },
          isFeatured: true,
          isPublished: true,
        },
      });

      return {
        type: 'child_category',
        category: { id: category.id, name: category.name, slug: category.slug },
        products: products.map(this.processProduct),
        pagination: {
          total: totalProducts,
          page,
          limit,
          lastPage: Math.ceil(totalProducts / limit),
        },
      };
    }
  }

  /**
   * Private helper to get all descendant category IDs for a given parent.
   * Uses a raw SQL query with a recursive CTE for high performance.
   */
  // private async getCategoryAndAllChildrenIds(categoryId: number): Promise<number[]> {
  //   const result: Array<{ id: number }> = await this.prisma.$queryRaw`
  //     WITH RECURSIVE subcategories AS (
  //       SELECT id FROM "category" WHERE id = ${categoryId}
  //       UNION ALL
  //       SELECT c.id FROM "category" c
  //       INNER JOIN subcategories s ON s.id = c."parentId"
  //     )
  //     SELECT id FROM subcategories;
  //   `;
  //   return result.map(c => c.id);
  // }

  /**
   * Reusable select object to keep queries consistent.
   */
  private getFeaturedProductSelect() {
    return {
      id: true,
      title: true,
      description: true,
      slug: true,
      images: true,
      business: { select: { name: true } },
      isCustomizable: true,
      _count: { select: { reviews: true, variants: true } },
      variants: {
        take: 1,
        orderBy: [{ isDefault: Prisma.SortOrder.desc }, { createdAt: Prisma.SortOrder.asc }],
        select: { price: true, mrp: true, images: true },
      },
    };
  }

  /**
   * Reusable processor to format the product data.
   */
  private processProduct(product: any) {
    const mainImages = product.images || [];
    const variantImages = product.variants.length > 0 ? product.variants[0].images || [] : [];
    const combinedImages = [...mainImages, ...variantImages].slice(0, 2);
    const selectedVariant = product.variants.length > 0 ? product.variants[0] : null;

    return {
      id: product.id,
      title: product.title,
      description: product.description,
      slug: product.slug, // Include slug for linking
      businessName: product.business?.name,
      numberOfReviews: product._count.reviews,
      price: selectedVariant?.price,
      mrp: selectedVariant?.mrp,
      images: combinedImages,
      isCustomizable: product.isCustomizable,
    };
  }

    // FIXED: The entire method logic is now correctly structured.
async createProduct(businessId: string, formData: any) {
  console.log(`[CREATE_PRODUCT] Service triggered for business ID: ${businessId}`);
  console.log('[CREATE_PRODUCT] Received Raw FormData:', JSON.stringify(formData, null, 2));

  const uploadedImageUrlsForRollback: string[] = [];

  try {
    // --- 1. PROCESS MAIN PRODUCT IMAGES ---
    console.log('[CREATE_PRODUCT] 🔄 Step 1: Processing main product images...');
    const finalProductImages: string[] = [];

    // A. Handle file uploads
    if (formData.imageFiles && formData.imageFiles.length > 0) {
      console.log(`[CREATE_PRODUCT] Found ${formData.imageFiles.length} product image file(s) to upload.`);
      for (const image of formData.imageFiles) {
        const imageUrl = await this.s3Service.uploadImage(image.buffer, image.filename, image.mimetype, "products");
        finalProductImages.push(imageUrl);
        uploadedImageUrlsForRollback.push(imageUrl);
      }
    } else {
      console.log('[CREATE_PRODUCT] No product image files to upload.');
    }

    // B. Handle direct URLs
    if (formData.productImageUrls && Array.isArray(formData.productImageUrls)) {
      console.log(`[CREATE_PRODUCT] Found ${formData.productImageUrls.length} direct product image URL(s).`);
      finalProductImages.push(...formData.productImageUrls);
    } else {
      console.log('[CREATE_PRODUCT] No direct product image URLs provided.');
    }
    console.log('[CREATE_PRODUCT] ✅ Final combined product images:', finalProductImages);
    
    // --- 2. GENERATE AND VALIDATE SLUG ---
    console.log(`[CREATE_PRODUCT] 🔄 Step 2: Generating and validating slug for title: "${formData.title}"`);
    const slug = this.generateSlug(formData.title);
    const existingProductWithSlug = await this.prisma.product.findUnique({ where: { slug } });
    if (existingProductWithSlug) {
      console.error(`[CREATE_PRODUCT] ❌ Slug conflict found for slug: "${slug}"`);
      throw new BadRequestException('A product with this title already exists, resulting in a duplicate slug.');
    }
    console.log(`[CREATE_PRODUCT] ✅ Slug is unique: ${slug}`);

    // --- 3. PROCESS VARIANTS ---
    console.log(`[CREATE_PRODUCT] 🔄 Step 3: Processing ${formData.variants.length} variant(s)...`);
    const variantsToCreate = await Promise.all(
      formData.variants.map(async (variant: any, index: number) => {
        console.log(`[VARIANT_LOOP | Index ${index}] --- Start processing variant with SKU: ${variant.sku} ---`);

        // 3a. Attribute validation
        if (!variant.attributes || !Array.isArray(variant.attributes) || variant.attributes.length === 0) {
          throw new BadRequestException(`Variant with SKU ${variant.sku} must have at least one attribute.`);
        }
        const attributeOptionIds = variant.attributes.map((attr: any) => parseInt(attr.attributeOptionId, 10));
        console.log(`[VARIANT_LOOP | Index ${index}] Validating Attribute Option IDs:`, attributeOptionIds);

        const chosenOptions = await this.prisma.attributeOption.findMany({
          where: { id: { in: attributeOptionIds } },
          select: { id: true, attributeId: true },
        });

        if (chosenOptions.length !== attributeOptionIds.length) {
          throw new BadRequestException(`One or more attribute options for variant SKU ${variant.sku} are invalid.`);
        }
        const parentAttributeIds = chosenOptions.map((opt) => opt.attributeId);
        if (new Set(parentAttributeIds).size !== parentAttributeIds.length) {
          throw new BadRequestException(`Variant with SKU ${variant.sku} cannot have multiple values for the same attribute type.`);
        }
        console.log(`[VARIANT_LOOP | Index ${index}] ✅ Attribute options validated successfully.`);
        
        const attributeValuesToCreate = chosenOptions.map((option) => ({
          attribute: { connect: { id: option.attributeId } },
          attributeOption: { connect: { id: option.id } },
        }));

        // 3b. Handle variant images
        const finalVariantImages: string[] = [];
        const variantImageFiles = formData.variantImageFilesMap.get(index.toString()) || 
                                 formData.variantImageFilesMap.get(variant.sku) || [];

        if (variantImageFiles.length > 0) {
          console.log(`[VARIANT_LOOP | Index ${index}] Found ${variantImageFiles.length} image file(s) for this variant.`);
          for (const imageData of variantImageFiles) {
            const imageUrl = await this.s3Service.uploadImage(imageData.buffer, imageData.filename, imageData.mimetype, "products");
            finalVariantImages.push(imageUrl);
            uploadedImageUrlsForRollback.push(imageUrl);
          }
        }
        
        if (variant.imageUrls && Array.isArray(variant.imageUrls) && variant.imageUrls.length > 0) {
          console.log(`[VARIANT_LOOP | Index ${index}] Found ${variant.imageUrls.length} direct image URL(s) for this variant.`);
          finalVariantImages.push(...variant.imageUrls);
        }
        console.log(`[VARIANT_LOOP | Index ${index}] ✅ Final combined images for this variant:`, finalVariantImages);

        const variantDataForPrisma = {
          sku: variant.sku,
          price: new Prisma.Decimal(variant.price),
          stock: parseInt(variant.stock, 10),
          mrp: variant.mrp ? new Prisma.Decimal(variant.mrp) : undefined,
          hsnCode: variant.hsnCode,
          images: finalVariantImages,
          attributeValues: { create: attributeValuesToCreate },
        };

        console.log(`[VARIANT_LOOP | Index ${index}] --- Finished processing variant. ---`);
        return variantDataForPrisma;
      }),
    );
    console.log('[CREATE_PRODUCT] ✅ All variants processed successfully.');
    console.log('[CREATE_PRODUCT] Final `variantsToCreate` object:', JSON.stringify(variantsToCreate, null, 2));

    // --- 4. CREATE PRODUCT IN DATABASE ---
    console.log('[CREATE_PRODUCT] 🔄 Step 4: Calling prisma.product.create with all data...');
    const product = await this.prisma.product.create({
      data: {
        title: formData.title,
        description: formData.description,
        slug: slug,
        images: finalProductImages,
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
    console.log(`[CREATE_PRODUCT] ✅ Prisma successfully created product with ID: ${product.id}`);

    return { success: true, message: 'Product created successfully', data: product };
  } catch (error) {
    console.error(`[CREATE_PRODUCT] ❌ ERROR caught in createProduct service:`, error);
    if (uploadedImageUrlsForRollback.length > 0) {
      console.warn('[CREATE_PRODUCT] Rolling back S3 uploads...');
      await this.s3Service.deleteImages(uploadedImageUrlsForRollback);
      console.warn('[CREATE_PRODUCT] ✅ S3 rollback complete.');
    }
    
    // Specific Prisma error handling
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = (error.meta?.target as string[]) || [];
        if (target.includes('sku')) {
          throw new BadRequestException('One of the provided SKU values is already in use.');
        }
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
  newModel3dFile?: any,
  newSlicenseDocumentFile?: any,
) {
  // --- STEP 1: PREPARATION (Outside the transaction) ---
  // This part of your code is excellent and remains unchanged.
  const product = await this.prisma.product.findUnique({
    where: { id: productId },
    include: { business: true, variants: true },
  });

  if (!product) {
    throw new NotFoundException(`Product with ID "${productId}" not found.`);
  }
  if (product.business.ownerId !== userId) {
    throw new ForbiddenException(
      'You do not have permission to modify this product.',
    );
  }

  const filesToDeleteFromS3: string[] = dto.imagesToDelete || [];
  if (dto.deleteModel3d && product.model3dUrl) {
    filesToDeleteFromS3.push(product.model3dUrl);
  }
  if (dto.deleteSlicenseDocument && product.licenseDocumentUrl) {
    filesToDeleteFromS3.push(product.licenseDocumentUrl);
  }
  
  if (filesToDeleteFromS3.length > 0) {
    await this.s3Service.deleteImages(filesToDeleteFromS3);
  }

  const newUploadedUrls: string[] = [];
  const uploadAndTrack = async (file: any): Promise<string> => {
    const url = await this.s3Service.uploadImage(file.buffer, file.filename, file.mimetype,"products");
    newUploadedUrls.push(url);
    return url;
  };

  try {
    const newProductImageUrls = await Promise.all(newProductImages.map(uploadAndTrack));
    const newModel3dUrl = newModel3dFile ? await uploadAndTrack(newModel3dFile) : undefined;
    const newlicenseDocumentUrl = newSlicenseDocumentFile ? await uploadAndTrack(newSlicenseDocumentFile) : undefined;

    const finalProductImages = [
      ...product.images.filter((url) => !dto.imagesToDelete?.includes(url)),
      ...newProductImageUrls,
    ];
    const finalModel3dUrl = newModel3dUrl ?? (dto.deleteModel3d ? null : product.model3dUrl);
    const finallicenseDocumentUrl = newlicenseDocumentUrl ?? (dto.deleteSlicenseDocument ? null : product.licenseDocumentUrl);
    
    const preparedVariantsData = await Promise.all(
      dto.variants.map(async (variantDto, index) => {
        const newVariantImages = newVariantImagesMap.get(index.toString()) || [];
        const newVariantImageUrls = await Promise.all(newVariantImages.map(uploadAndTrack));
        const finalVariantImages = [
          ...(variantDto.images || []).filter(url => !dto.imagesToDelete?.includes(url)),
          ...newVariantImageUrls,
        ];
        return { dto: variantDto, finalImages: finalVariantImages };
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
            slug: dto.title && dto.title !== product.title ? this.generateSlug(dto.title) : undefined,
            images: finalProductImages,
            model3dUrl: finalModel3dUrl,
            licenseDocumentUrl: finallicenseDocumentUrl,
            customizationConfig: dto.customizationConfig ? JSON.parse(dto.customizationConfig) : undefined,
          },
        });

        // 2b. Process Variants - Deletions
        const existingVariantIds = product.variants.map((v) => v.id);
        const incomingVariantIds = dto.variants.map((v) => v.id).filter(Boolean);
        const variantsToDelete = existingVariantIds.filter((id) => !incomingVariantIds.includes(id));
        if (variantsToDelete.length > 0) {
          await tx.variant.deleteMany({ where: { id: { in: variantsToDelete } } });
        }

        // 2c. Process Variants - Updates and Creates (THE FIX IS HERE)
        for (const preparedVariant of preparedVariantsData) {
          const variantDto = preparedVariant.dto;
          const finalImages = preparedVariant.finalImages;

          const attributeValuesToCreate = variantDto.attributeValues.map((attr) => ({
            attribute: { connect: { id: attr.attributeId } },
            attributeOption: { connect: { id: attr.attributeOptionId } },
          }));

          if (variantDto.id) {
            // UPDATE EXISTING VARIANT
            await tx.variantAttributeValue.deleteMany({ where: { variantId: variantDto.id } });
            await tx.variant.update({
              where: { id: variantDto.id },
              data: {
                sku: variantDto.sku,
                price: variantDto.price,
                mrp: variantDto.mrp,
                stock: variantDto.stock,
                status: variantDto.status,
                images: finalImages,
                attributeValues: { create: attributeValuesToCreate },
              },
            });
          } else {
            // CREATE NEW VARIANT
            await tx.variant.create({
              data: {
                sku: variantDto.sku,
                price: variantDto.price,
                mrp: variantDto.mrp,
                stock: variantDto.stock,
                status: variantDto.status,
                images: finalImages,
                product: { connect: { id: productId } },
                attributeValues: { create: attributeValuesToCreate },
              },
            });
          }
        }

        // 2d. Return the fully updated product
        return tx.product.findUnique({
          where: { id: productId },
          include: {
            variants: { include: { attributeValues: { include: { attribute: true, attributeOption: true } } } },
            category: true,
          },
        });
      },
      { maxWait: 15000, timeout: 30000 },
    );
  } catch (error) {
    if (newUploadedUrls.length > 0) {
      console.error('An error occurred. Rolling back S3 uploads:', newUploadedUrls);
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


  /**
   * Private helper to get all descendant category IDs for a given parent.
   * Uses a raw SQL query with a recursive CTE for high performance.
   */
  private async getCategoryAndAllChildrenIds(categoryId: number): Promise<number[]> {
    const result: Array<{ id: number }> = await this.prisma.$queryRaw`
      WITH RECURSIVE subcategories AS (
        SELECT id FROM "category" WHERE id = ${categoryId}
        UNION ALL
        SELECT c.id FROM "category" c
        INNER JOIN subcategories s ON s.id = c."parentId"
      )
      SELECT id FROM subcategories;
    `;
    return result.map(c => c.id);
  }


 async getCategoryPageDataBySlug(
    categorySlug: string,
    paginationQuery: PaginationQueryDto, // DTO with optional page/limit
  ) {
    // 1. Find the category by its slug, including its direct children
    const category = await this.prisma.category.findUnique({
      where: { slug: categorySlug },
      include: { children: { select: { id: true, name: true, slug: true } } },
    });

    if (!category) {
      throw new NotFoundException(`Category with slug "${categorySlug}" not found.`);
    }

    const isParentCategory = category.children.length > 0;

    // --- CASE 1: IT'S A PARENT CATEGORY ---
    if (isParentCategory) {
      // For each child category, fetch up to 5 of its featured products
      const childrenWithProducts = await Promise.all(
        category.children.map(async (child) => {
          const products = await this.prisma.product.findMany({
            where: {
              categoryId: child.id,
              isFeatured: true,
              isPublished: true,
            },
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: this.getFeaturedProductSelect(), // Reusable select object
          });

          return {
            ...child,
            products: products.map(this.processProduct), // Process each product
          };
        })
      );

      return {
        type: 'parent_category',
        category: { id: category.id, name: category.name, slug: category.slug },
        children: childrenWithProducts,
      };
    }

    // --- CASE 2: IT'S A CHILD CATEGORY (or a category with no children) ---
    else {
      const { page = 1, limit = 10 } = paginationQuery;
      const skip = (page - 1) * limit;
      
      const products = await this.prisma.product.findMany({
        where: {
          categoryId: category.id, // Only look in this specific category
          isFeatured: true,
          isPublished: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: this.getFeaturedProductSelect(),
      });

      const totalProducts = await this.prisma.product.count({
        where: { categoryId: category.id, isFeatured: true, isPublished: true },
      });

      return {
        type: 'child_category',
        category: { id: category.id, name: category.name, slug: category.slug },
        products: products.map(this.processProduct),
        pagination: {
          total: totalProducts,
          page,
          limit,
          lastPage: Math.ceil(totalProducts / limit),
        },
      };
    }
  }

  /**
   * Reusable select object to get all the necessary product fields.
   */
  // private getFeaturedProductSelect() {
  //   return {
  //     id: true,
  //     title: true,
  //     description: true,
  //     slug: true,
  //     images: true,
  //     isCustomizable: true,
  //     business: { select: { name: true } },
  //     _count: { select: { reviews: true } },
  //     variants: {
  //       take: 1,
  //       orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  //       select: { price: true, mrp: true, images: true },
  //     },
  //   };
  // }

  /**
   * Reusable processor to format the product data exactly as in your example.
   */
  // private processProduct(product: any): any { // Using 'any' as Prisma's select result is complex
  //   const selectedVariant = product.variants.length > 0 ? product.variants[0] : null;

  //   // Combine main product images and the default variant's images
  //   const combinedImages = [
  //       ...(product.images || []),
  //       ...(selectedVariant?.images || [])
  //   ];

  //   return {
  //     id: product.id,
  //     title: product.title,
  //     description: product.description,
  //     slug: product.slug,
  //     businessName: product.business?.name,
  //     numberOfReviews: product._count.reviews,
  //     price: selectedVariant?.price?.toString(), // Ensure price is a string
  //     mrp: selectedVariant?.mrp?.toString(),     // Ensure mrp is a string
  //     images: combinedImages,
  //     isCustomizable: product.isCustomizable,
  //   };
  // }
}