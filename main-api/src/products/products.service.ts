// src/products/products.service.ts
import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from './utils/s3Service';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductPaginationDto } from './dto/product-pagination.dto';
import { Prisma, VariantStatus } from '@prisma/client';
import {  StockMethod } from '@prisma/client';

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
  const categoryId = parseInt(formData.categoryId, 10);

  // ── Validate category ────────────────────────────────────────────────────
  const category = await this.prisma.category.findUnique({
    where: { id: categoryId },
    select: { gstRate: true },
  });
  if (!category) throw new BadRequestException(`Category with ID ${categoryId} not found.`);
  const gstRate = category.gstRate ?? new Prisma.Decimal(0);

  // ── Fetch default warehouse (optional — gracefully skipped if none exists) ─
  const defaultWarehouse = await this.prisma.warehouse.findFirst({
    where: { businessId, isDefault: true },
    select: { id: true },
  });

  const uploadedUrlsForRollback: string[] = [];

  try {
    // ── Process product-level images ─────────────────────────────────────────
    const finalProductImages: string[] = [];

    if (formData.imageFiles?.length > 0) {
      for (const img of formData.imageFiles) {
        const url = await this.s3Service.uploadImage(img.buffer, img.filename, img.mimetype, 'products');
        finalProductImages.push(url);
        uploadedUrlsForRollback.push(url);
      }
    }
    if (Array.isArray(formData.productImageUrls)) {
      finalProductImages.push(...formData.productImageUrls);
    }

    // ── Generate & validate slug ──────────────────────────────────────────────
    const slug = this.generateSlug(formData.title);
    const slugExists = await this.prisma.product.findUnique({ where: { slug } });
    if (slugExists) throw new BadRequestException('A product with this title already exists.');

    // ── Enforce isDefault on variants ─────────────────────────────────────────
    const variants: any[] = formData.variants;
    const hasDefault = variants.some((v) => v.isDefault === true || v.isDefault === 'true');
    if (!hasDefault) variants[0].isDefault = true;
    let defaultSet = false;
    for (const v of variants) {
      if ((v.isDefault === true || v.isDefault === 'true') && !defaultSet) {
        v.isDefault = true; defaultSet = true;
      } else {
        v.isDefault = false;
      }
    }

    // ── Process variants ──────────────────────────────────────────────────────
    const variantsToCreate = await Promise.all(
      variants.map(async (variant: any, index: number) => {

        // Attribute validation
        if (!variant.attributes?.length) {
          throw new BadRequestException(`Variant SKU "${variant.sku}" must have at least one attribute.`);
        }
        const optionIds = variant.attributes.map((a: any) => parseInt(a.attributeOptionId, 10));
        const chosenOptions = await this.prisma.attributeOption.findMany({
          where: { id: { in: optionIds } },
          select: { id: true, attributeId: true },
        });
        if (chosenOptions.length !== optionIds.length) {
          throw new BadRequestException(`Invalid attribute options for variant "${variant.sku}".`);
        }
        const attrIds = chosenOptions.map((o) => o.attributeId);
        if (new Set(attrIds).size !== attrIds.length) {
          throw new BadRequestException(`Variant "${variant.sku}" has duplicate attribute types.`);
        }
        const attributeValuesToCreate = chosenOptions.map((opt) => ({
          attribute: { connect: { id: opt.attributeId } },
          attributeOption: { connect: { id: opt.id } },
        }));

        // Variant images — file uploads + direct URLs
        const finalVariantImages: string[] = [];
        const variantFiles =
          formData.variantImageFilesMap.get(index.toString()) ||
          formData.variantImageFilesMap.get(variant.sku) || [];
        for (const img of variantFiles) {
          const url = await this.s3Service.uploadImage(img.buffer, img.filename, img.mimetype, 'products');
          finalVariantImages.push(url);
          uploadedUrlsForRollback.push(url);
        }
        if (Array.isArray(variant.imageUrls)) finalVariantImages.push(...variant.imageUrls);

        // Build full variant data with safe defaults for ALL optional fields
        return {
          sku:                    variant.sku,
          price:                  new Prisma.Decimal(variant.price),
          stock:                  parseInt(variant.stock, 10),
          mrp:                    variant.mrp ? new Prisma.Decimal(variant.mrp) : undefined,
          purchasePrice:          variant.purchasePrice ? new Prisma.Decimal(variant.purchasePrice) : undefined,
          hsnCode:                variant.hsnCode ?? undefined,
          sacCode:                variant.sacCode ?? undefined,
          tax:                    gstRate.toString(),
          weightInGrams:          variant.weightInGrams ? parseInt(variant.weightInGrams, 10) : undefined,
          height:                 variant.height ? new Prisma.Decimal(variant.height) : undefined,
          width:                  variant.width ? new Prisma.Decimal(variant.width) : undefined,
          length:                 variant.length ? new Prisma.Decimal(variant.length) : undefined,
          dimensionUnit:          variant.dimensionUnit ?? 'CM',
          minStockCount:          variant.minStockCount ? new Prisma.Decimal(variant.minStockCount) : undefined,
          isMinStockAlertEnabled: variant.isMinStockAlertEnabled ?? false,
          // Advanced features — all OFF by default
          isBatchingEnabled:      variant.isBatchingEnabled ?? false,
          isExpiryTracked:        variant.isExpiryTracked ?? false,
          isSerialTracked:        variant.isSerialTracked ?? false,
          expiryAlertDays:        variant.expiryAlertDays ?? undefined,
          stockDeductionMethod:   variant.stockDeductionMethod ?? 'FIFO',
          isDefault:              variant.isDefault ?? false,
          status:                 VariantStatus.ACTIVE,
          description:            variant.description ?? undefined,
          images:                 finalVariantImages,
          attributeValues:        { create: attributeValuesToCreate },
        };
      }),
    );

    // ── DB Transaction ────────────────────────────────────────────────────────
const product = await this.prisma.$transaction(
  async (tx) => {
    // Step 1: Create product WITH variants but WITHOUT include
    const created = await tx.product.create({
      data: {
        title:               formData.title,
        description:         formData.description,
        slug,
        images:              finalProductImages,
        productType:         formData.productType ?? 'STANDARD',
        brand:               formData.brand ?? undefined,
        tags:                Array.isArray(formData.tags) ? formData.tags : [],
        metaTitle:           formData.metaTitle ?? undefined,
        metaDescription:     formData.metaDescription ?? undefined,
        isCustomizable:      formData.isCustomizable ?? false,
        customizationConfig: formData.customizationConfig
                               ? JSON.parse(formData.customizationConfig) : undefined,
        isFeatured:          formData.isFeatured ?? false,
        publishDate:         formData.publishDate ? new Date(formData.publishDate) : undefined,
        isPublished:         false,
        business:            { connect: { id: businessId } },
        category:            { connect: { id: categoryId } },
        variants:            { create: variantsToCreate },
      },
    });

    // Step 2: Fetch created variants separately for WarehouseStock seeding
    if (defaultWarehouse) {
      const createdVariants = await tx.variant.findMany({
        where: { productId: created.id },
        select: { id: true, stock: true },
      });

      for (const variant of createdVariants) {
        if (variant.stock > 0) {
          await tx.warehouseStock.create({
            data: {
              warehouseId: defaultWarehouse.id,
              variantId:   variant.id,
              quantity:    variant.stock,
            },
          });
          await tx.stockActivity.create({
            data: {
              businessId,
              itemId:        created.id,
              variantId:     variant.id,
              activityType:  'OPENING',
              invoicePrefix: 'PROD',
              invoiceNo:     0,
              quantity:      new Prisma.Decimal(variant.stock),
              closingStock:  new Prisma.Decimal(variant.stock),
            },
          });
        }
      }
    }

    // Step 3: Return fully populated product
    return tx.product.findUnique({
      where: { id: created.id },
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
  },
  { maxWait: 15000, timeout: 30000 },
);


    return { success: true, message: 'Product created successfully', data: product };

  } catch (error) {
    if (uploadedUrlsForRollback.length > 0) {
      await this.s3Service.deleteImages(uploadedUrlsForRollback);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = (error.meta?.target as string[]) || [];
        if (target.includes('sku'))  throw new BadRequestException('A provided SKU is already in use.');
        if (target.includes('slug')) throw new BadRequestException('A product with this title already exists.');
      }
      if (error.code === 'P2025') throw new BadRequestException('A referenced category or attribute option does not exist.');
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
          category: { select: { id: true, name: true } },
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
      category:p.category,
      price: p.variants.length > 0 ? p.variants[0].price : null,
      stock: p.variants.length > 0 ? p.variants[0].stock : null,
    }));
    
    const totalPages = Math.ceil(total / limit);
    return { data: formattedProducts, pagination: { total, page: Number(page), limit: Number(limit), totalPages, hasNextPage: Number(page) < totalPages, hasPrevPage: Number(page) > 1 } };
  }

  /**
   * Fetches a single product with all its detailed variant and attribute information.
   */
// src/products/products.service.ts

async getProductByIdForBusiness(businessId: string, productId: string, userId: string) {
  const product = await this.prisma.product.findFirst({
    where: {
      id: productId,
      businessId: businessId,
      business: { ownerId: userId }, // Triple-check for security
    },
    include: {
      category: { select: { id: true, name: true } },
      variants: {
        orderBy: { createdAt: 'asc' },
        // --- THIS IS THE FIX ---
        // Start with a 'select' block to specify all desired fields and relations.
        select: {
          // 1. List all the SCALAR fields from the Variant model you need.
          id: true,
          sku: true,
          price: true,
          stock: true,
          mrp: true,
          hsnCode: true,
          images: true,
          tax: true, // This now works correctly.
          isDefault: true,
          status: true,
          // ... add any other variant fields you need, like 'weightInGrams'

          // 2. Now, include the RELATION inside the same 'select' block.
          attributeValues: {
            include: {
              attribute: { select: { id: true, name: true } },
              attributeOption: { select: { id: true, value: true } },
            },
          },
        },
        // --- END OF FIX ---
      },
      reviews: { take: 5, orderBy: { createdAt: 'desc' } },
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

// src/products/products.service.ts

async updateProduct(
  productId: string,
  userId: string,
  dto: UpdateProductDto,
  newProductImages: any[],
  newVariantImagesMap: Map<string, any[]>,
  newModel3dFile?: any,
  newSlicenseDocumentFile?: any,
  callerRole: 'admin' | 'seller' = 'seller',
) {
  console.log(`[UPDATE_PRODUCT] Service triggered for Product ID: ${productId}`);

  // --- STEP 1: Fetch & Validate ---
  const product = await this.prisma.product.findUnique({
    where: { id: productId },
    include: { business: true, variants: true },
  });
  if (!product) throw new NotFoundException(`Product with ID "${productId}" not found.`);
  if (product.business.ownerId !== userId)
    throw new ForbiddenException('You do not have permission to modify this product.');

  // --- STEP 2: Validate attribute options ---
  for (const variantDto of dto.variants) {
    if (!variantDto.attributeValues?.length) {
      throw new BadRequestException(`Variant SKU "${variantDto.sku}" must have at least one attribute.`);
    }
    const optionIds = variantDto.attributeValues.map((a) => a.attributeOptionId);
    const options = await this.prisma.attributeOption.findMany({
      where: { id: { in: optionIds } },
      select: { id: true, attributeId: true },
    });
    if (options.length !== optionIds.length)
      throw new BadRequestException(`Invalid attribute options for variant SKU "${variantDto.sku}".`);
    const attrIds = options.map((o) => o.attributeId);
    if (new Set(attrIds).size !== attrIds.length)
      throw new BadRequestException(`Variant "${variantDto.sku}" has duplicate attribute types.`);
  }

  // --- STEP 3: Enforce exactly one isDefault variant ---
  const explicitDefaultCount = dto.variants.filter((v) => v.isDefault).length;
  if (explicitDefaultCount === 0) {
    dto.variants[0].isDefault = true;
  } else if (explicitDefaultCount > 1) {
    let found = false;
    for (const v of dto.variants) {
      if (v.isDefault && !found) { found = true; }
      else { v.isDefault = false; }
    }
  }

  // --- STEP 4: S3 Deletions ---
  const filesToDelete: string[] = dto.imagesToDelete ?? [];
  if (dto.deleteModel3d && product.model3dUrl) filesToDelete.push(product.model3dUrl);
  if (dto.deleteSlicenseDocument && product.licenseDocumentUrl) filesToDelete.push(product.licenseDocumentUrl);
  if (filesToDelete.length > 0) {
    console.log('[UPDATE_PRODUCT] Deleting from S3:', filesToDelete);
    await this.s3Service.deleteImages(filesToDelete);
  }

  // --- STEP 5: S3 Uploads ---
  const newUploadedUrls: string[] = [];

  const uploadAndTrack = async (file: any, type: string): Promise<string> => {
    const url = await this.s3Service.uploadImage(
      file.buffer,
      file.filename,
      file.mimetype,
      'products',
    );
    newUploadedUrls.push(url);
    console.log(`[UPLOAD] ${type} → ${url}`);
    return url;
  };

  try {
    const newProductImageUrls = await Promise.all(
      newProductImages.map((f) => uploadAndTrack(f, 'product')),
    );
    const newModel3dUrl = newModel3dFile
      ? await uploadAndTrack(newModel3dFile, 'model3d')
      : undefined;
    const newLicenseDocUrl = newSlicenseDocumentFile
      ? await uploadAndTrack(newSlicenseDocumentFile, 'licenseDocument')
      : undefined;

    // Merge existing + newly uploaded + newly provided URLs for product images
    const incomingProductUrlsFromDto: string[] = dto.newProductImageUrls ?? [];
    const finalProductImages = [
      ...product.images.filter((url) => !dto.imagesToDelete?.includes(url)),
      ...newProductImageUrls,         // S3 uploaded files
      ...incomingProductUrlsFromDto,  // direct URLs from frontend
    ];

    const finalModel3dUrl = newModel3dUrl ?? (dto.deleteModel3d ? null : product.model3dUrl);
    const finalLicenseDocUrl = newLicenseDocUrl ?? (dto.deleteSlicenseDocument ? null : product.licenseDocumentUrl);

    // Prepare variant image data outside transaction
    const preparedVariants = await Promise.all(
      dto.variants.map(async (variantDto, index) => {
        const newFiles = newVariantImagesMap.get(index.toString()) ?? [];
        const newUploadedVariantUrls = await Promise.all(
          newFiles.map((f) => uploadAndTrack(f, `variant_${index}`)),
        );
        // Also accept direct URLs per variant from DTO
        const incomingVariantUrls: string[] = variantDto.newImageUrls ?? [];
        const finalImages = [
          ...(variantDto.images ?? []).filter((url) => !dto.imagesToDelete?.includes(url)),
          ...newUploadedVariantUrls,
          ...incomingVariantUrls,
        ];
        return { dto: variantDto, finalImages };
      }),
    );

    // --- STEP 6: Fetch default warehouse ---
    const defaultWarehouse = await this.prisma.warehouse.findFirst({
      where: { businessId: product.businessId, isDefault: true },
      select: { id: true },
    });

    const existingStockMap = new Map<string, number>(
      product.variants.map((v) => [v.id, v.stock]),
    );

    // --- STEP 7: Database Transaction ---
    return await this.prisma.$transaction(
      async (tx) => {

        // 7a. Update main product
        await tx.product.update({
          where: { id: productId },
          data: {
            title:          dto.title,
            description:    dto.description,
            isFeatured:     dto.isFeatured,       // ✅ sellers can set
            isCustomizable: dto.isCustomizable,
            brand:          dto.brand || undefined,
            tags:           dto.tags ?? undefined,
            metaTitle:      dto.metaTitle || undefined,
            metaDescription: dto.metaDescription || undefined,
            slug: dto.title && dto.title !== product.title
              ? this.generateSlug(dto.title)
              : undefined,
            images:              finalProductImages,
            model3dUrl:          finalModel3dUrl,
            licenseDocumentUrl:  finalLicenseDocUrl,
            customizationConfig: dto.customizationConfig
              ? JSON.parse(dto.customizationConfig)
              : undefined,
            // ✅ isPublished: admin only
            ...(callerRole === 'admin' && dto.isPublished !== undefined
              ? {
                  isPublished: dto.isPublished,
                  publishDate: dto.publishDate ? new Date(dto.publishDate) : undefined,
                }
              : {}),
          },
        });

        // 7b. Delete removed variants
        const existingVariantIds = product.variants.map((v) => v.id);
        const incomingVariantIds = dto.variants.map((v) => v.id).filter(Boolean) as string[];
        const variantsToDelete = existingVariantIds.filter((id) => !incomingVariantIds.includes(id));
        if (variantsToDelete.length > 0) {
          console.log('[TX] Deleting variants:', variantsToDelete);
          await tx.variantAttributeValue.deleteMany({
            where: { variantId: { in: variantsToDelete } },
          });
          await tx.variant.deleteMany({ where: { id: { in: variantsToDelete } } });
        }

        // 7c. Upsert variants
        for (const { dto: variantDto, finalImages } of preparedVariants) {
          const attributeValuesToCreate = variantDto.attributeValues.map((attr) => ({
            attribute:       { connect: { id: attr.attributeId } },
            attributeOption: { connect: { id: attr.attributeOptionId } },
          }));

          // ✅ FIXED variantPayload — sellingPriceType removed, empty strings → undefined
          const variantPayload = {
            sku:                    variantDto.sku,
            price:                  new Prisma.Decimal(variantDto.price),
            mrp:                    variantDto.mrp
                                      ? new Prisma.Decimal(variantDto.mrp)
                                      : undefined,
            purchasePrice:          variantDto.purchasePrice
                                      ? new Prisma.Decimal(variantDto.purchasePrice)
                                      : undefined,
            // sellingPriceType:    ← REMOVED, does not exist in Variant schema
            stock:                  variantDto.stock,
            hsnCode:                variantDto.hsnCode  || undefined,
            sacCode:                variantDto.sacCode  || undefined,
            tax:                    variantDto.tax      || undefined,
            description:            variantDto.description || undefined,
            weightInGrams:          variantDto.weightInGrams
                                      ? Number(variantDto.weightInGrams)
                                      : undefined,
            height:                 variantDto.height
                                      ? new Prisma.Decimal(variantDto.height)
                                      : undefined,
            width:                  variantDto.width
                                      ? new Prisma.Decimal(variantDto.width)
                                      : undefined,
            length:                 variantDto.length
                                      ? new Prisma.Decimal(variantDto.length)
                                      : undefined,
            dimensionUnit:          variantDto.dimensionUnit   ?? 'CM',
            minStockCount:          variantDto.minStockCount
                                      ? new Prisma.Decimal(variantDto.minStockCount)
                                      : undefined,
            isMinStockAlertEnabled: variantDto.isMinStockAlertEnabled ?? false,
            // ✅ Batching
            isBatchingEnabled:      variantDto.isBatchingEnabled  ?? false,
            // ✅ Expiry
            isExpiryTracked:        variantDto.isExpiryTracked    ?? false,
            expiryAlertDays:        variantDto.expiryAlertDays    ?? undefined,
            // ✅ Serialisation
            isSerialTracked:        variantDto.isSerialTracked    ?? false,
            stockDeductionMethod:   (variantDto.stockDeductionMethod ?? StockMethod.FIFO) as StockMethod,
            isDefault:              variantDto.isDefault ?? false,
            status:                 (variantDto.status ?? VariantStatus.ACTIVE) as VariantStatus,
            images:                 finalImages,
          };

          console.log('[TX] Creating/Updating variant:', variantPayload);

          if (variantDto.id) {
            // ── UPDATE existing variant ──────────────────────────────────
            const oldStock = existingStockMap.get(variantDto.id) ?? 0;
            const stockDelta = variantDto.stock - oldStock;

            await tx.variantAttributeValue.deleteMany({
              where: { variantId: variantDto.id },
            });
            await tx.variant.update({
              where: { id: variantDto.id },
              data: {
                ...variantPayload,
                attributeValues: { create: attributeValuesToCreate },
              },
            });

            // Sync WarehouseStock
            if (stockDelta !== 0 && defaultWarehouse) {
              await tx.warehouseStock.upsert({
                where: {
                  warehouseId_variantId: {
                    warehouseId: defaultWarehouse.id,
                    variantId:   variantDto.id,
                  },
                },
                update: { quantity: { increment: stockDelta } },
                create: {
                  warehouseId: defaultWarehouse.id,
                  variantId:   variantDto.id,
                  quantity:    variantDto.stock,
                },
              });
            }

            // StockActivity audit log
            if (stockDelta !== 0) {
              await tx.stockActivity.create({
                data: {
                  businessId:    product.businessId,
                  itemId:        productId,
                  variantId:     variantDto.id,
                  activityType:  stockDelta > 0 ? 'STOCK_IN' : 'STOCK_OUT',
                  invoicePrefix: 'ADJ',
                  invoiceNo:     0,
                  quantity:      new Prisma.Decimal(Math.abs(stockDelta)),
                  closingStock:  new Prisma.Decimal(variantDto.stock),
                },
              });
            }

          } else {
            // ── CREATE new variant ───────────────────────────────────────
            const newVariant = await tx.variant.create({
              data: {
                ...variantPayload,
                product:         { connect: { id: productId } },
                attributeValues: { create: attributeValuesToCreate },
              },
            });

            // Seed WarehouseStock
            if (variantDto.stock > 0 && defaultWarehouse) {
              await tx.warehouseStock.create({
                data: {
                  warehouseId: defaultWarehouse.id,
                  variantId:   newVariant.id,
                  quantity:    variantDto.stock,
                },
              });
              await tx.stockActivity.create({
                data: {
                  businessId:    product.businessId,
                  itemId:        productId,
                  variantId:     newVariant.id,
                  activityType:  'OPENING',
                  invoicePrefix: 'ADJ',
                  invoiceNo:     0,
                  quantity:      new Prisma.Decimal(variantDto.stock),
                  closingStock:  new Prisma.Decimal(variantDto.stock),
                },
              });
            }
          }
        }

        // 7d. Return fully updated product
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
    console.error('[UPDATE_PRODUCT] ❌ Error:', error);

    // S3 rollback on any failure
    if (newUploadedUrls.length > 0) {
      console.warn('[UPDATE_PRODUCT] Rolling back S3 uploads...');
      await this.s3Service.deleteImages(newUploadedUrls).catch((e) =>
        console.error('[UPDATE_PRODUCT] S3 rollback failed:', e),
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = (error.meta?.target as string[]) || [];
        if (target.includes('sku'))
          throw new BadRequestException('One of the provided SKU values is already in use.');
      }
      if (error.code === 'P2025')
        throw new BadRequestException(
          'A referenced record (category, attribute option) does not exist.',
        );
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
        slug: productId,
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
            customerUserId: true,
            rating: true,
            comment: true,
            createdAt: true,
             images: true,
              customerUser: {
            select: {
              name: true,
              picture: true, // Included picture for the user avatar
            },
          },
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