// src/products/products.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from './utils/s3Service';
import {
  BusinessProductQueryDto,
  CategoryPageQueryDto,
  PaginationQueryDto,
} from './dto/pagination-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductPaginationDto } from './dto/product-pagination.dto';
import { Prisma, VariantStatus } from '@prisma/client';
import { StockMethod } from '@prisma/client';
import { restOfIndiaRate } from '../payment/utils/xpressbees-calculator';
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
        }),
      );

      return {
        type: 'parent_category',
        category: { id: category.id, name: category.name, slug: category.slug },
        children: childrenWithProducts,
      };
    }

    // --- CASE 2: IT'S A CHILD CATEGORY (or a category with no children) ---
    else {
      const allCategoryIds =
        await this.getCategoryAndAllChildrenIds(categoryId);

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
      isCustomizable: true,
      business: { select: { name: true } },
      _count: { select: { reviews: true, variants: true } },
      variants: {
        take: 1,
        orderBy: [
          { isDefault: Prisma.SortOrder.desc },
          { createdAt: Prisma.SortOrder.asc },
        ],
        select: {
          price: true,
          mrp: true,
          images: true,
          weightInGrams: true, // ← added
          length: true, // ← added
          width: true, // ← added
          height: true, // ← added
        },
      },
    };
  }

  private processProduct(product: any) {
    const mainImages = product.images ?? [];
    const variantImages = product.variants?.[0]?.images ?? [];
    const combinedImages = [...mainImages, ...variantImages].slice(0, 2);
    const defaultVariant = product.variants?.[0] ?? null;

    // ── Shipping Manipulation ──────────────────────────────
    let finalPrice = defaultVariant?.price;
    let finalMrp = defaultVariant?.mrp;
    let shippingIncluded = false;
    let shippingCharge = 0;
    let freeShipping = false;

    if (defaultVariant) {
      const basePrice = Number(defaultVariant.price);
      const baseMrp = Number(defaultVariant.mrp);

      if (basePrice > 399) {
        const actualG = Number(defaultVariant.weightInGrams ?? 500);
        const l = parseFloat(defaultVariant.length?.toString() ?? '0');
        const w = parseFloat(defaultVariant.width?.toString() ?? '0');
        const h = parseFloat(defaultVariant.height?.toString() ?? '0');

        const volG = l > 0 && w > 0 && h > 0 ? (l * w * h) / 5 : 0;
        const chargeableG = Math.ceil(Math.max(actualG, volG) / 500) * 500;

        shippingCharge = restOfIndiaRate(chargeableG);
        finalPrice = String(basePrice + shippingCharge);
        finalMrp = String(baseMrp + shippingCharge);
        shippingIncluded = true;
        freeShipping = true;
      }
    }
    // ──────────────────────────────────────────────────────

    return {
      id: product.id,
      title: product.title,
      description: product.description,
      slug: product.slug,
      businessName: product.business?.name,
      numberOfReviews: product._count?.reviews ?? 0,
      price: finalPrice,
      mrp: finalMrp,
      images: combinedImages,
      isCustomizable: product.isCustomizable,
      shippingIncluded,
      shippingCharge,
      freeShippingEligible: freeShipping,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CREATE PRODUCT
  // ─────────────────────────────────────────────────────────────────────────────

  async createProduct(businessId: string, formData: any) {
    console.log(`[CREATE_PRODUCT] businessId=${businessId}`);

    // ── 1. Validate category ──────────────────────────────────────────────────
    const categoryId = parseInt(formData.categoryId, 10);
    if (isNaN(categoryId)) throw new BadRequestException('Invalid categoryId.');

    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { gstRate: true },
    });
    if (!category)
      throw new BadRequestException(`Category ${categoryId} not found.`);
    const gstRate = category.gstRate ?? new Prisma.Decimal(0);

    // ── 2. Default warehouse (optional) ──────────────────────────────────────
    const defaultWarehouse = await this.prisma.warehouse.findFirst({
      where: { businessId, isDefault: true },
      select: { id: true },
    });

    // ── 3. Validate variants array ────────────────────────────────────────────
    const variants: any[] = formData.variants;
    if (!Array.isArray(variants) || variants.length === 0) {
      throw new BadRequestException('At least one variant is required.');
    }

    const uploadedUrlsForRollback: string[] = [];

    try {
      // ── 4. Upload product-level images ──────────────────────────────────────
      const finalProductImages: string[] = [];

      if (formData.imageFiles?.length > 0) {
        for (const img of formData.imageFiles) {
          const url = await this.s3Service.uploadImage(
            img.buffer,
            img.filename,
            img.mimetype,
            'products',
          );
          finalProductImages.push(url);
          uploadedUrlsForRollback.push(url);
        }
      }
      if (Array.isArray(formData.productImageUrls)) {
        finalProductImages.push(...formData.productImageUrls);
      }
      if (finalProductImages.length === 0) {
        // Allow variant-only images — checked at variant level below
        console.warn('[CREATE_PRODUCT] No product-level images provided.');
      }

      // ── 5. Generate & validate slug ──────────────────────────────────────────
      const slug = this.generateSlug(formData.title);
      const slugExists = await this.prisma.product.findUnique({
        where: { slug },
      });
      if (slugExists)
        throw new BadRequestException(
          'A product with this title already exists.',
        );

      // ── 6. Enforce exactly one isDefault variant ──────────────────────────────
      const hasDefault = variants.some(
        (v) => v.isDefault === true || v.isDefault === 'true',
      );
      if (!hasDefault) variants[0].isDefault = true;
      let defaultSet = false;
      for (const v of variants) {
        if ((v.isDefault === true || v.isDefault === 'true') && !defaultSet) {
          v.isDefault = true;
          defaultSet = true;
        } else {
          v.isDefault = false;
        }
      }

      // ── 7. Process variants ───────────────────────────────────────────────────
      const variantsToCreate = await Promise.all(
        variants.map(async (variant: any, index: number) => {
          // ── 7a. Mandatory physical fields ────────────────────────────────────
          if (!variant.weightInGrams) {
            throw new BadRequestException(
              `Variant "${variant.sku}" is missing required field: weightInGrams.`,
            );
          }
          if (!variant.length || !variant.width || !variant.height) {
            throw new BadRequestException(
              `Variant "${variant.sku}" is missing required dimensions (length, width, height).`,
            );
          }

          // ── 7b. Billable weight (actual vs volumetric) ────────────────────────
          const actualGrams = parseInt(variant.weightInGrams, 10);
          const lengthCm = parseFloat(variant.length);
          const widthCm = parseFloat(variant.width);
          const heightCm = parseFloat(variant.height);
          const variantTax = variant.tax || gstRate.toString();
          const volumetricGrams = (lengthCm * widthCm * heightCm) / 5; // cm³/5000 × 1000
          const billableGrams = Math.max(actualGrams, volumetricGrams);
          console.log(
            `[SHIPPING] Variant "${variant.sku}" — actual=${actualGrams}g | volumetric=${volumetricGrams.toFixed(0)}g | billable=${billableGrams.toFixed(0)}g`,
          );

          // ── 7c. Attribute validation ──────────────────────────────────────────
          if (!variant.attributes?.length) {
            throw new BadRequestException(
              `Variant SKU "${variant.sku}" must have at least one attribute.`,
            );
          }
          const optionIds = variant.attributes.map((a: any) =>
            parseInt(a.attributeOptionId, 10),
          );
          const chosenOptions = await this.prisma.attributeOption.findMany({
            where: { id: { in: optionIds } },
            select: { id: true, attributeId: true },
          });
          if (chosenOptions.length !== optionIds.length) {
            throw new BadRequestException(
              `Invalid attribute options for variant "${variant.sku}".`,
            );
          }
          const attrIds = chosenOptions.map((o) => o.attributeId);
          if (new Set(attrIds).size !== attrIds.length) {
            throw new BadRequestException(
              `Variant "${variant.sku}" has duplicate attribute types.`,
            );
          }
          const attributeValuesToCreate = chosenOptions.map((opt) => ({
            attribute: { connect: { id: opt.attributeId } },
            attributeOption: { connect: { id: opt.id } },
          }));

          // ── 7d. Variant image uploads ─────────────────────────────────────────
          const finalVariantImages: string[] = [];
          const variantFiles =
            formData.variantImageFilesMap?.get(index.toString()) ||
            formData.variantImageFilesMap?.get(variant.sku) ||
            [];
          for (const img of variantFiles) {
            const url = await this.s3Service.uploadImage(
              img.buffer,
              img.filename,
              img.mimetype,
              'products',
            );
            finalVariantImages.push(url);
            uploadedUrlsForRollback.push(url);
          }
          if (Array.isArray(variant.imageUrls)) {
            finalVariantImages.push(...variant.imageUrls);
          }

          // ── 7e. Build Prisma variant payload ──────────────────────────────────
          return {
            sku: variant.sku,
            price: new Prisma.Decimal(variant.price),
            stock: parseInt(variant.stock, 10),
            mrp: variant.mrp ? new Prisma.Decimal(variant.mrp) : undefined,
            purchasePrice: variant.purchasePrice
              ? new Prisma.Decimal(variant.purchasePrice)
              : undefined,
            hsnCode: variant.hsnCode || undefined,
            sacCode: variant.sacCode || undefined,
            tax: variantTax,
            // Physical — guaranteed non-null after guard above
            weightInGrams: actualGrams,
            length: new Prisma.Decimal(lengthCm),
            width: new Prisma.Decimal(widthCm),
            height: new Prisma.Decimal(heightCm),
            dimensionUnit: variant.dimensionUnit ?? 'CM',
            // Stock alerts
            minStockCount: variant.minStockCount
              ? new Prisma.Decimal(variant.minStockCount)
              : undefined,
            isMinStockAlertEnabled: variant.isMinStockAlertEnabled ?? false,
            // Advanced features — all OFF by default
            isBatchingEnabled: variant.isBatchingEnabled ?? false,
            isExpiryTracked: variant.isExpiryTracked ?? false,
            isSerialTracked: variant.isSerialTracked ?? false,
            expiryAlertDays: variant.expiryAlertDays ?? undefined,
            stockDeductionMethod: (variant.stockDeductionMethod ??
              'FIFO') as StockMethod,
            isDefault: variant.isDefault ?? false,
            status: VariantStatus.ACTIVE,
            description: variant.description || undefined,
            images: finalVariantImages,
            attributeValues: { create: attributeValuesToCreate },
          };
        }),
      );

      // ── 8. DB Transaction ─────────────────────────────────────────────────────
      const product = await this.prisma.$transaction(
        async (tx) => {
          // 8a. Create product + variants
          const created = await tx.product.create({
            data: {
              title: formData.title,
              description: formData.description,
              slug,
              images: finalProductImages,
              productType: formData.productType ?? 'STANDARD',
              brand: formData.brand || undefined,
              tags: Array.isArray(formData.tags) ? formData.tags : [],
              metaTitle: formData.metaTitle || undefined,
              metaDescription: formData.metaDescription || undefined,

              // ✅ FIX: Convert string "true"/"false" to actual boolean
              isCustomizable:
                formData.isCustomizable === 'true' ||
                formData.isCustomizable === true,
              isFeatured:
                formData.isFeatured === 'true' || formData.isFeatured === true,

              publishDate: formData.publishDate
                ? new Date(formData.publishDate)
                : undefined,
              isPublished: false,
              business: { connect: { id: businessId } },
              category: { connect: { id: categoryId } },
              variants: { create: variantsToCreate },
            },
          });

          // 8b. Seed WarehouseStock + StockActivity for variants with stock > 0
          if (defaultWarehouse) {
            const createdVariants = await tx.variant.findMany({
              where: { productId: created.id },
              select: { id: true, stock: true },
            });

            for (const v of createdVariants) {
              if (v.stock > 0) {
                await tx.warehouseStock.create({
                  data: {
                    warehouseId: defaultWarehouse.id,
                    variantId: v.id,
                    quantity: v.stock,
                  },
                });
                await tx.stockActivity.create({
                  data: {
                    businessId,
                    itemId: created.id,
                    variantId: v.id,
                    activityType: 'OPENING',
                    invoicePrefix: 'PROD',
                    invoiceNo: 0,
                    quantity: new Prisma.Decimal(v.stock),
                    closingStock: new Prisma.Decimal(v.stock),
                  },
                });
              }
            }
          }

          // 8c. Return fully populated product
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

      console.log(`[CREATE_PRODUCT] ✅ Product created: ${product?.id}`);
      return {
        success: true,
        message: 'Product created successfully',
        data: product,
      };
    } catch (error) {
      // ── S3 rollback ───────────────────────────────────────────────────────────
      if (uploadedUrlsForRollback.length > 0) {
        console.warn('[CREATE_PRODUCT] Rolling back S3 uploads...');
        await this.s3Service
          .deleteImages(uploadedUrlsForRollback)
          .catch((e) =>
            console.error('[CREATE_PRODUCT] S3 rollback failed:', e),
          );
      }

      // ── Prisma known errors ───────────────────────────────────────────────────
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = (error.meta?.target as string[]) || [];
          if (target.includes('sku'))
            throw new BadRequestException('A provided SKU is already in use.');
          if (target.includes('slug'))
            throw new BadRequestException(
              'A product with this title already exists.',
            );
          throw new BadRequestException('A unique constraint was violated.');
        }
        if (error.code === 'P2025') {
          throw new BadRequestException(
            'A referenced record (category / attribute option) does not exist.',
          );
        }
      }

      throw error;
    }
  }

  /**
   * Fetches a paginated list of products for a given business, optimized for list views.
   */
  async getProductsByBusiness(
    businessId: string,
    query: BusinessProductQueryDto,
    userId: string,
  ) {
    const { page = 1, limit = 10, search } = query;
    const skip = (Number(page) - 1) * Number(limit);

    // 1. Ownership & Existence Check
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true },
    });

    if (!business)
      throw new NotFoundException(`Business with ID "${businessId}" not found`);
    if (business.ownerId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access products for this business.',
      );
    }

    // 2. Build Dynamic Where Clause
    const whereClause: Prisma.ProductWhereInput = {
      businessId: businessId,
      deletedAt: null, // Always filter out deleted items
    };

    if (search) {
      whereClause.OR = [
        {
          title: { contains: search, mode: 'insensitive' },
        },
        {
          category: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
        {
          variants: {
            some: {
              sku: { contains: search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    // 3. Execution (Transaction for consistent pagination count)
    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where: whereClause,
        select: {
          id: true,
          title: true,
          slug: true,
          images: true,
          isPublished: true,
          isFeatured: true,
          category: { select: { id: true, name: true } },
          variants: {
            where: { isDefault: true, deletedAt: null },
            select: { price: true, stock: true },
            take: 1,
          },
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where: whereClause }),
    ]);

    // 4. Formatting (Keeping response structure identical)
    const formattedProducts = products.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      images: p.images,
      isPublished: p.isPublished,
      isFeatured: p.isFeatured,
      category: p.category,
      price: p.variants.length > 0 ? p.variants[0].price : null,
      stock: p.variants.length > 0 ? p.variants[0].stock : null,
    }));

    const totalPages = Math.ceil(total / Number(limit));

    return {
      data: formattedProducts,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages,
        hasNextPage: Number(page) < totalPages,
        hasPrevPage: Number(page) > 1,
      },
    };
  }

  /**
   * Fetches a single product with all its detailed variant and attribute information.
   */
  // src/products/products.service.ts

  async getProductByIdForBusiness(
    businessId: string,
    productId: string,
    userId: string,
  ) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        businessId: businessId,
        business: { ownerId: userId },
      },
      include: {
        category: {
          select: { id: true, name: true, gstRate: true },
        },

        variants: {
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            sku: true,
            status: true,
            isDefault: true,
            description: true,
            price: true,
            mrp: true,
            purchasePrice: true,
            tax: true,
            hsnCode: true,
            sacCode: true,
            stock: true,
            minStockCount: true,
            isMinStockAlertEnabled: true,
            weightInGrams: true,
            length: true,
            width: true,
            height: true,
            dimensionUnit: true,
            isBatchingEnabled: true,
            isExpiryTracked: true,
            expiryAlertDays: true,
            isSerialTracked: true,
            stockDeductionMethod: true,
            images: true,
            createdAt: true,
            updatedAt: true,
            attributeValues: {
              select: {
                id: true,
                attribute: { select: { id: true, name: true } },
                attributeOption: { select: { id: true, value: true } },
              },
            },
          },
        },

        // ── FIX: removed `user` — Review model has no such relation ──────────
        // Add only scalar fields that exist on your Review model.
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            // ✅ Add your actual reviewer relation here if needed, e.g.:
            // reviewer: { select: { id: true, name: true } },
            // buyer:    { select: { id: true, name: true } },
          },
        },

        _count: {
          select: { reviews: true, variants: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(
        `Product "${productId}" not found or you do not have permission to access it.`,
      );
    }

    // ── Computed shipping info per variant ─────────────────────────────────────
    const variantsWithShipping = product.variants.map((v) => {
      const actualGrams = v.weightInGrams ?? 0;
      const l = v.length ? parseFloat(v.length.toString()) : 0;
      const w = v.width ? parseFloat(v.width.toString()) : 0;
      const h = v.height ? parseFloat(v.height.toString()) : 0;
      const volumetricGrams = l && w && h ? (l * w * h) / 5 : 0;
      const billableGrams = Math.max(actualGrams, volumetricGrams);

      return {
        ...v,
        _shipping: {
          actualGrams,
          volumetricGrams: parseFloat(volumetricGrams.toFixed(2)),
          billableGrams: parseFloat(billableGrams.toFixed(2)),
          billableKg: parseFloat((billableGrams / 1000).toFixed(3)),
          basis: billableGrams === volumetricGrams ? 'volumetric' : 'actual',
        },
      };
    });

    return {
      ...product,
      variants: variantsWithShipping,
      totalReviews: product._count.reviews,
      totalVariants: product._count.variants,
    };
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

  // src/products/products.service.ts — updateProduct()

  // file: src/product/product.service.ts

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
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`[UPDATE_PRODUCT] 🚀 Start`);
  console.log(
    `[UPDATE_PRODUCT] productId=${productId} | userId=${userId} | callerRole=${callerRole}`,
  );
  console.log(
    `[UPDATE_PRODUCT] Incoming variants count: ${dto.variants?.length ?? 0}`,
  );
  console.log(
    `[UPDATE_PRODUCT] New product images: ${newProductImages.length}`,
  );
  console.log(
    `[UPDATE_PRODUCT] New variant image map keys: [${[...newVariantImagesMap.keys()].join(', ')}]`,
  );
  console.log(
    `[UPDATE_PRODUCT] newModel3dFile: ${newModel3dFile?.filename ?? 'none'}`,
  );
  console.log(
    `[UPDATE_PRODUCT] newSlicenseDocumentFile: ${newSlicenseDocumentFile?.filename ?? 'none'}`,
  );
  console.log(`${'─'.repeat(60)}`);

  console.log(`[UPDATE_PRODUCT][1] Fetching product from DB...`);
  const product = await this.prisma.product.findUnique({
    where: { id: productId },
    include: {
      business: true,
      variants: true,
      category: true, // added for category gst fallback
    },
  });

  if (!product) {
    console.error(`[UPDATE_PRODUCT][1] ❌ Product not found: ${productId}`);
    throw new NotFoundException(`Product "${productId}" not found.`);
  }

  const categoryTax = product.category?.gstRate?.toString() || '0';
  console.log(
    `[UPDATE_PRODUCT][1] ✅ Found product: "${product.title}" (businessId=${product.businessId}) | categoryTax=${categoryTax}`,
  );
  console.log(
    `[UPDATE_PRODUCT][1] Existing variants: [${product.variants.map((v) => `${v.id}(${v.sku})`).join(', ')}]`,
  );

  if (callerRole === 'seller' && product.business.ownerId !== userId) {
    console.error(
      `[UPDATE_PRODUCT][1] ❌ Forbidden — ownerId=${product.business.ownerId} vs userId=${userId}`,
    );
    throw new ForbiddenException(
      'You do not have permission to modify this product.',
    );
  }
  console.log(`[UPDATE_PRODUCT][1] ✅ Ownership check passed`);

  console.log(
    `\n[UPDATE_PRODUCT][2] Validating ${dto.variants?.length ?? 0} variant(s)...`,
  );
  if (!Array.isArray(dto.variants) || dto.variants.length === 0) {
    throw new BadRequestException('At least one variant is required.');
  }

  for (const variantDto of dto.variants) {
    console.log(
      `[UPDATE_PRODUCT][2] → Variant "${variantDto.sku}" (id=${variantDto.id ?? 'NEW'})`,
    );
    console.log(
      `[UPDATE_PRODUCT][2]   price=${variantDto.price} | stock=${variantDto.stock} | mrp=${variantDto.mrp ?? 'n/a'} | tax=${variantDto.tax ?? `(fallback:${categoryTax})`}`,
    );
    console.log(
      `[UPDATE_PRODUCT][2]   weight=${variantDto.weightInGrams}g | L=${variantDto.length} W=${variantDto.width} H=${variantDto.height} cm`,
    );
    console.log(
      `[UPDATE_PRODUCT][2]   attributeValues: [${variantDto.attributeValues?.map((a) => `attrId=${a.attributeId}→optId=${a.attributeOptionId}`).join(', ')}]`,
    );

    if (!variantDto.weightInGrams || variantDto.weightInGrams < 1) {
      console.error(
        `[UPDATE_PRODUCT][2] ❌ Missing weightInGrams for "${variantDto.sku}"`,
      );
      throw new BadRequestException(
        `Variant "${variantDto.sku}" is missing required field: weightInGrams.`,
      );
    }

    if (!variantDto.length || !variantDto.width || !variantDto.height) {
      console.error(
        `[UPDATE_PRODUCT][2] ❌ Missing dimensions for "${variantDto.sku}": L=${variantDto.length} W=${variantDto.width} H=${variantDto.height}`,
      );
      throw new BadRequestException(
        `Variant "${variantDto.sku}" is missing required dimensions (length, width, height).`,
      );
    }

    if (!variantDto.attributeValues?.length) {
      console.error(
        `[UPDATE_PRODUCT][2] ❌ No attributeValues for "${variantDto.sku}"`,
      );
      throw new BadRequestException(
        `Variant SKU "${variantDto.sku}" must have at least one attribute.`,
      );
    }

    const optionIds = variantDto.attributeValues.map(
      (a) => a.attributeOptionId,
    );
    console.log(
      `[UPDATE_PRODUCT][2]   Checking optionIds in DB: [${optionIds.join(', ')}]`,
    );

    const options = await this.prisma.attributeOption.findMany({
      where: { id: { in: optionIds } },
      select: { id: true, attributeId: true },
    });

    console.log(
      `[UPDATE_PRODUCT][2]   DB returned ${options.length}/${optionIds.length} options`,
    );

    if (options.length !== optionIds.length) {
      console.error(
        `[UPDATE_PRODUCT][2] ❌ Invalid option IDs for "${variantDto.sku}" — expected ${optionIds.length}, got ${options.length}`,
      );
      throw new BadRequestException(
        `Invalid attribute options for variant SKU "${variantDto.sku}".`,
      );
    }

    const attrIds = options.map((o) => o.attributeId);
    if (new Set(attrIds).size !== attrIds.length) {
      console.error(
        `[UPDATE_PRODUCT][2] ❌ Duplicate attribute types for "${variantDto.sku}": [${attrIds.join(', ')}]`,
      );
      throw new BadRequestException(
        `Variant "${variantDto.sku}" has duplicate attribute types.`,
      );
    }

    console.log(
      `[UPDATE_PRODUCT][2]   ✅ Variant "${variantDto.sku}" validated`,
    );
  }

  console.log(`\n[UPDATE_PRODUCT][3] Enforcing isDefault...`);
  const defaultCount = dto.variants.filter((v) => v.isDefault).length;
  console.log(
    `[UPDATE_PRODUCT][3] isDefault count in payload: ${defaultCount}`,
  );

  if (defaultCount === 0) {
    dto.variants[0].isDefault = true;
    console.log(
      `[UPDATE_PRODUCT][3] No default found — forcing first variant "${dto.variants[0].sku}" as default`,
    );
  } else if (defaultCount > 1) {
    let found = false;
    for (const v of dto.variants) {
      if (v.isDefault && !found) {
        found = true;
        console.log(`[UPDATE_PRODUCT][3] Keeping "${v.sku}" as default`);
      } else if (v.isDefault) {
        v.isDefault = false;
        console.log(`[UPDATE_PRODUCT][3] Clearing isDefault from "${v.sku}"`);
      }
    }
  } else {
    console.log(
      `[UPDATE_PRODUCT][3] ✅ Single default: "${dto.variants.find((v) => v.isDefault)?.sku}"`,
    );
  }

  console.log(`\n[UPDATE_PRODUCT][4] S3 deletions...`);
  const filesToDelete: string[] = [...(dto.imagesToDelete ?? [])];

  if (dto.deleteModel3d && product.model3dUrl) {
    filesToDelete.push(product.model3dUrl);
    console.log(
      `[UPDATE_PRODUCT][4] Queued model3d for deletion: ${product.model3dUrl}`,
    );
  }

  if (dto.deleteSlicenseDocument && product.licenseDocumentUrl) {
    filesToDelete.push(product.licenseDocumentUrl);
    console.log(
      `[UPDATE_PRODUCT][4] Queued licenseDoc for deletion: ${product.licenseDocumentUrl}`,
    );
  }

  if (filesToDelete.length > 0) {
    console.log(
      `[UPDATE_PRODUCT][4] Deleting ${filesToDelete.length} file(s) from S3:`,
      filesToDelete,
    );
    await this.s3Service.deleteImages(filesToDelete);
    console.log(`[UPDATE_PRODUCT][4] ✅ S3 deletions complete`);
  } else {
    console.log(`[UPDATE_PRODUCT][4] No files to delete`);
  }

  console.log(`\n[UPDATE_PRODUCT][5] S3 uploads...`);
  const newUploadedUrls: string[] = [];

  const uploadAndTrack = async (file: any, tag: string): Promise<string> => {
    console.log(
      `[UPLOAD] Uploading [${tag}]: ${file.filename} (${file.mimetype}, ${file.buffer?.length ?? '?'} bytes)`,
    );
    const url = await this.s3Service.uploadImage(
      file.buffer,
      file.filename,
      file.mimetype,
      'products',
    );
    newUploadedUrls.push(url);
    console.log(`[UPLOAD] ✅ [${tag}] → ${url}`);
    return url;
  };

  try {
    const newProductImageUrls = await Promise.all(
      newProductImages.map((f) => uploadAndTrack(f, 'product-image')),
    );
    console.log(
      `[UPDATE_PRODUCT][5] Product images uploaded: ${newProductImageUrls.length}`,
    );

    const newModel3dUrl = newModel3dFile
      ? await uploadAndTrack(newModel3dFile, 'model3d')
      : undefined;

    const newLicenseDocUrl = newSlicenseDocumentFile
      ? await uploadAndTrack(newSlicenseDocumentFile, 'licenseDoc')
      : undefined;

    const finalProductImages = [
      ...product.images.filter((url) => !dto.imagesToDelete?.includes(url)),
      ...newProductImageUrls,
      ...(dto.newProductImageUrls ?? []),
    ];
    console.log(
      `[UPDATE_PRODUCT][5] Final product image count: ${finalProductImages.length}`,
    );

    const finalModel3dUrl =
      newModel3dUrl ?? (dto.deleteModel3d ? null : product.model3dUrl);

    const finalLicenseDocUrl =
      newLicenseDocUrl ??
      (dto.deleteSlicenseDocument ? null : product.licenseDocumentUrl);

    console.log(
      `[UPDATE_PRODUCT][5] model3dUrl: ${finalModel3dUrl ?? 'null'}`,
    );
    console.log(
      `[UPDATE_PRODUCT][5] licenseDocUrl: ${finalLicenseDocUrl ?? 'null'}`,
    );

    console.log(`\n[UPDATE_PRODUCT][6] Preparing variant images...`);
    const preparedVariants = await Promise.all(
      dto.variants.map(async (variantDto, index) => {
        const newFiles = newVariantImagesMap.get(index.toString()) ?? [];
        console.log(
          `[UPDATE_PRODUCT][6] Variant[${index}] "${variantDto.sku}" — ${newFiles.length} new file(s)`,
        );

        const newUploadedVariantUrls = await Promise.all(
          newFiles.map((f) =>
            uploadAndTrack(f, `variant_${index}_${variantDto.sku}`),
          ),
        );

        const finalImages = [
          ...(variantDto.images ?? []).filter(
            (url) => !dto.imagesToDelete?.includes(url),
          ),
          ...newUploadedVariantUrls,
          ...(variantDto.newImageUrls ?? []),
        ];

        console.log(
          `[UPDATE_PRODUCT][6] Variant "${variantDto.sku}" final images: ${finalImages.length}`,
        );

        const volumetricGrams =
          (variantDto.length * variantDto.width * variantDto.height) / 5;
        const billableGrams = Math.max(
          variantDto.weightInGrams,
          volumetricGrams,
        );
        console.log(
          `[SHIPPING] "${variantDto.sku}" — actual=${variantDto.weightInGrams}g | volumetric=${volumetricGrams.toFixed(0)}g | billable=${billableGrams.toFixed(0)}g (${billableGrams === volumetricGrams ? 'volumetric' : 'actual'} wins)`,
        );

        return { dto: variantDto, finalImages };
      }),
    );

    console.log(`\n[UPDATE_PRODUCT][7] Fetching default warehouse...`);
    const defaultWarehouse = await this.prisma.warehouse.findFirst({
      where: { businessId: product.businessId, isDefault: true },
      select: { id: true },
    });

    console.log(
      `[UPDATE_PRODUCT][7] Default warehouse: ${defaultWarehouse?.id ?? 'NONE — stock sync skipped'}`,
    );

    const existingStockMap = new Map<string, number>(
      product.variants.map((v) => [v.id, v.stock]),
    );
    console.log(
      `[UPDATE_PRODUCT][7] Existing stock snapshot: {${[...existingStockMap.entries()].map(([id, s]) => `${id}:${s}`).join(', ')}}`,
    );

    console.log(`\n[UPDATE_PRODUCT][8] Starting DB transaction...`);
    return await this.prisma.$transaction(
      async (tx) => {
        console.log(`[TX][8a] Updating product record...`);
        await tx.product.update({
          where: { id: productId },
          data: {
            title: dto.title,
            description: dto.description,
            isCustomizable: dto.isCustomizable,
            isFeatured: dto.isFeatured,
            brand: dto.brand || undefined,
            tags: dto.tags ?? undefined,
            metaTitle: dto.metaTitle || undefined,
            metaDescription: dto.metaDescription || undefined,
            slug:
              dto.title && dto.title !== product.title
                ? this.generateSlug(dto.title)
                : undefined,
            images: finalProductImages,
            model3dUrl: finalModel3dUrl,
            licenseDocumentUrl: finalLicenseDocUrl,
            customizationConfig: dto.customizationConfig
              ? JSON.parse(dto.customizationConfig)
              : undefined,
            ...(callerRole === 'admin' && dto.isPublished !== undefined
              ? {
                  isPublished: dto.isPublished,
                  publishDate: dto.publishDate
                    ? new Date(dto.publishDate)
                    : undefined,
                }
              : {}),
          },
        });
        console.log(`[TX][8a] ✅ Product record updated`);

        const existingVariantIds = product.variants.map((v) => v.id);
        const incomingVariantIds = dto.variants
          .map((v) => v.id)
          .filter(Boolean) as string[];
        const variantsToDelete = existingVariantIds.filter(
          (id) => !incomingVariantIds.includes(id),
        );

        console.log(
          `[TX][8b] Existing variant IDs: [${existingVariantIds.join(', ')}]`,
        );
        console.log(
          `[TX][8b] Incoming variant IDs: [${incomingVariantIds.join(', ')}]`,
        );
        console.log(
          `[TX][8b] Variants to delete: [${variantsToDelete.join(', ') || 'none'}]`,
        );

        if (variantsToDelete.length > 0) {
          await tx.variantAttributeValue.deleteMany({
            where: { variantId: { in: variantsToDelete } },
          });
          await tx.variant.deleteMany({
            where: { id: { in: variantsToDelete } },
          });
          console.log(
            `[TX][8b] ✅ Deleted ${variantsToDelete.length} variant(s)`,
          );
        }

        for (const { dto: variantDto, finalImages } of preparedVariants) {
          const isUpdate = !!variantDto.id;
          console.log(
            `\n[TX][8c] ${isUpdate ? 'UPDATE' : 'CREATE'} variant "${variantDto.sku}" (id=${variantDto.id ?? 'NEW'})`,
          );

          const attributeValuesToCreate = variantDto.attributeValues.map(
            (attr) => ({
              attribute: { connect: { id: attr.attributeId } },
              attributeOption: { connect: { id: attr.attributeOptionId } },
            }),
          );

          const resolvedTax = variantDto.tax ?? categoryTax;

          const variantPayload = {
            sku: variantDto.sku,
            price: new Prisma.Decimal(variantDto.price),
            mrp: variantDto.mrp
              ? new Prisma.Decimal(variantDto.mrp)
              : undefined,
            purchasePrice: variantDto.purchasePrice
              ? new Prisma.Decimal(variantDto.purchasePrice)
              : undefined,
            stock: variantDto.stock,
            hsnCode: variantDto.hsnCode || undefined,
            sacCode: variantDto.sacCode || undefined,
            tax: resolvedTax,
            description: variantDto.description || undefined,
            weightInGrams: variantDto.weightInGrams,
            length: new Prisma.Decimal(variantDto.length),
            width: new Prisma.Decimal(variantDto.width),
            height: new Prisma.Decimal(variantDto.height),
            dimensionUnit: variantDto.dimensionUnit ?? 'CM',
            minStockCount: variantDto.minStockCount
              ? new Prisma.Decimal(variantDto.minStockCount)
              : undefined,
            isMinStockAlertEnabled:
              variantDto.isMinStockAlertEnabled ?? false,
            isBatchingEnabled: variantDto.isBatchingEnabled ?? false,
            isExpiryTracked: variantDto.isExpiryTracked ?? false,
            expiryAlertDays: variantDto.expiryAlertDays ?? undefined,
            isSerialTracked: variantDto.isSerialTracked ?? false,
            stockDeductionMethod: (variantDto.stockDeductionMethod ??
              StockMethod.FIFO) as StockMethod,
            isDefault: variantDto.isDefault ?? false,
            status: (variantDto.status ??
              VariantStatus.ACTIVE) as VariantStatus,
            images: finalImages,
          };

          console.log(
            `[TX][8c] Payload: price=${variantPayload.price} | stock=${variantPayload.stock} | tax=${variantPayload.tax} | weight=${variantPayload.weightInGrams}g | L/W/H=${variantPayload.length}/${variantPayload.width}/${variantPayload.height}`,
          );

          if (isUpdate) {
            const oldStock = existingStockMap.get(variantDto.id!) ?? 0;
            const stockDelta = variantDto.stock - oldStock;
            console.log(
              `[TX][8c] Stock delta for "${variantDto.sku}": ${oldStock} → ${variantDto.stock} (Δ${stockDelta >= 0 ? '+' : ''}${stockDelta})`,
            );

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
            console.log(`[TX][8c] ✅ Variant updated: ${variantDto.id}`);

            if (stockDelta !== 0 && defaultWarehouse) {
              console.log(
                `[TX][8c] Syncing WarehouseStock — warehouseId=${defaultWarehouse.id} Δ${stockDelta}`,
              );
              await tx.warehouseStock.upsert({
                where: {
                  warehouseId_variantId: {
                    warehouseId: defaultWarehouse.id,
                    variantId: variantDto.id!,
                  },
                },
                update: { quantity: { increment: stockDelta } },
                create: {
                  warehouseId: defaultWarehouse.id,
                  variantId: variantDto.id!,
                  quantity: variantDto.stock,
                },
              });
              console.log(`[TX][8c] ✅ WarehouseStock synced`);
            }

            if (stockDelta !== 0) {
              const actType = stockDelta > 0 ? 'STOCK_IN' : 'STOCK_OUT';
              console.log(
                `[TX][8c] Creating StockActivity: ${actType} qty=${Math.abs(stockDelta)} closing=${variantDto.stock}`,
              );
              await tx.stockActivity.create({
                data: {
                  businessId: product.businessId,
                  itemId: productId,
                  variantId: variantDto.id!,
                  activityType: actType,
                  invoicePrefix: 'ADJ',
                  invoiceNo: 0,
                  quantity: new Prisma.Decimal(Math.abs(stockDelta)),
                  closingStock: new Prisma.Decimal(variantDto.stock),
                },
              });
              console.log(`[TX][8c] ✅ StockActivity created`);
            }
          } else {
            const newVariant = await tx.variant.create({
              data: {
                ...variantPayload,
                product: { connect: { id: productId } },
                attributeValues: { create: attributeValuesToCreate },
              },
            });

            console.log(
              `[TX][8c] ✅ New variant created: ${newVariant.id} ("${variantDto.sku}")`,
            );

            if (variantDto.stock > 0 && defaultWarehouse) {
              console.log(
                `[TX][8c] Seeding WarehouseStock for new variant: qty=${variantDto.stock}`,
              );
              await tx.warehouseStock.create({
                data: {
                  warehouseId: defaultWarehouse.id,
                  variantId: newVariant.id,
                  quantity: variantDto.stock,
                },
              });

              await tx.stockActivity.create({
                data: {
                  businessId: product.businessId,
                  itemId: productId,
                  variantId: newVariant.id,
                  activityType: 'OPENING',
                  invoicePrefix: 'ADJ',
                  invoiceNo: 0,
                  quantity: new Prisma.Decimal(variantDto.stock),
                  closingStock: new Prisma.Decimal(variantDto.stock),
                },
              });

              console.log(
                `[TX][8c] ✅ WarehouseStock + StockActivity seeded`,
              );
            }
          }
        }

        console.log(`\n[TX][8d] Fetching final product state...`);
        const result = await tx.product.findUnique({
          where: { id: productId },
          include: {
            category: true,
            variants: {
              include: {
                attributeValues: {
                  include: { attribute: true, attributeOption: true },
                },
              },
            },
          },
        });

        console.log(
          `[TX][8d] ✅ Transaction complete — variants returned: ${result?.variants?.length ?? 0}`,
        );
        return result;
      },
      { maxWait: 15000, timeout: 30000 },
    );
  } catch (error) {
    console.error(`\n[UPDATE_PRODUCT] ❌ Error caught:`);
    console.error(error);

    if (newUploadedUrls.length > 0) {
      console.warn(
        `[UPDATE_PRODUCT] Rolling back ${newUploadedUrls.length} S3 upload(s):`,
        newUploadedUrls,
      );
      await this.s3Service
        .deleteImages(newUploadedUrls)
        .catch((e) =>
          console.error('[UPDATE_PRODUCT] ⚠️  S3 rollback failed:', e),
        );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(
        `[UPDATE_PRODUCT] Prisma error code: ${error.code} | meta:`,
        error.meta,
      );

      if (error.code === 'P2002') {
        const target = (error.meta?.target as string[]) || [];
        if (target.includes('sku')) {
          throw new BadRequestException(
            'One of the provided SKU values is already in use.',
          );
        }
        throw new BadRequestException('A unique constraint was violated.');
      }

      if (error.code === 'P2025') {
        throw new BadRequestException(
          'A referenced record (category / attribute option) does not exist.',
        );
      }
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
      throw new NotFoundException(
        `Business with ID "${businessId}" not found.`,
      );
    }

    if (business.ownerId !== userId) {
      throw new ForbiddenException(
        "You do not have permission to access this business's inventory.",
      );
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

  // src/products/products.service.ts

  async getProductDetailsForCustomer(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: {
        slug: productId,
        isPublished: true,
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
            country: true,
            isVerified: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
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
          },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        },
        reviews: {
          take: 10,
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
                picture: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with ID ${productId} not found or not published.`,
      );
    }

    // ─── Shipping Manipulation ───────────────────────────────
    const manipulatedVariants = product.variants.map((variant) => {
      const basePrice = Number(variant.price);
      const baseMrp = Number(variant.mrp);

      // Only manipulate if price > 399
      if (basePrice <= 399) {
        return {
          ...variant,
          shippingIncluded: false,
          shippingCharge: 0,
          freeShippingEligible: false,
        };
      }

      // ── Chargeable Weight ──────────────────────────────────
      const actualG = variant.weightInGrams ?? 500;

      const l = parseFloat(variant.length?.toString() ?? '0');
      const w = parseFloat(variant.width?.toString() ?? '0');
      const h = parseFloat(variant.height?.toString() ?? '0');
      const volG = l > 0 && w > 0 && h > 0 ? (l * w * h) / 5 : 0;

      const chargeableG = Math.ceil(Math.max(actualG, volG) / 500) * 500;

      // ── REST_OF_INDIA Rate ─────────────────────────────────
      const shippingCharge = restOfIndiaRate(chargeableG);

      return {
        ...variant,
        price: String(basePrice + shippingCharge),
        mrp: String(baseMrp + shippingCharge),
        shippingIncluded: true,
        shippingCharge,
        freeShippingEligible: true,
      };
    });
    // ─────────────────────────────────────────────────────────

    return {
      ...product,
      variants: manipulatedVariants,
    };
  }

  /**
   * Private helper to get all descendant category IDs for a given parent.
   * Uses a raw SQL query with a recursive CTE for high performance.
   */
  private async getCategoryAndAllChildrenIds(
    categoryId: number,
  ): Promise<number[]> {
    const result: Array<{ id: number }> = await this.prisma.$queryRaw`
      WITH RECURSIVE subcategories AS (
        SELECT id FROM "category" WHERE id = ${categoryId}
        UNION ALL
        SELECT c.id FROM "category" c
        INNER JOIN subcategories s ON s.id = c."parentId"
      )
      SELECT id FROM subcategories;
    `;
    return result.map((c) => c.id);
  }

  async getCategoryPageDataBySlug(
    categorySlug: string,
    query: CategoryPageQueryDto,
  ) {
    const { page = 1, limit = 10, priceRange, attributes } = query;
    const skip = (page - 1) * limit;

    const category = await this.prisma.category.findUnique({
      where: { slug: categorySlug },
      include: {
        children: { select: { id: true, name: true, slug: true } },
        attributes: {
          include: { options: { select: { value: true } } },
        },
      },
    });

    if (!category) throw new NotFoundException('Category not found');

    // 1. Initialize the variant filter object separately to avoid "undefined" errors
    const variantFilter: Prisma.VariantWhereInput = {
      status: 'ACTIVE',
      deletedAt: null,
    };

    // 2. Apply Price Filter to the variant object
    if (priceRange) {
      const rangeMap = {
        '0-500': { gte: 0, lte: 500 },
        '500-1k': { gte: 500, lte: 1000 },
        '1k-5k': { gte: 1000, lte: 5000 },
        '5k-10k': { gte: 5000, lte: 10000 },
        '10k-20k': { gte: 10000, lte: 20000 },
      };
      variantFilter.price = rangeMap[priceRange];
    }

    // 3. Apply Attribute Cross-Filtering to the variant object
    if (attributes) {
      const filterPairs = attributes.split(',').map((p) => p.split(':'));

      // Use AND to ensure one variant matches ALL selected attributes
      variantFilter.AND = filterPairs.map(([attrName, attrValue]) => ({
        attributeValues: {
          some: {
            attribute: { name: attrName },
            attributeOption: { value: attrValue },
          },
        },
      }));
    }

    // 4. Build the final Product Where clause
    const where: Prisma.ProductWhereInput = {
      categoryId: category.id,
      isPublished: true,
      isFeatured: true,
      deletedAt: null,
      variants: {
        some: variantFilter, // Assign the fully built object here
      },
    };

    // 5. Execute Queries
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: this.getFeaturedProductSelect(),
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        availableFilters: category.attributes.map((a) => ({
          name: a.name,
          options: a.options.map((o) => o.value),
        })),
      },
      products: products.map(this.processProduct),
      pagination: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
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
  // src/products/products.service.ts

  // src/products/products.service.ts

  async getSimilarProducts(slug: string, limit = 8) {
    const product = await this.prisma.product.findUnique({
      where: { slug, isPublished: true, deletedAt: null },
      select: {
        id: true,
        categoryId: true,
        brand: true,
        tags: true,
      },
    });

    if (!product) throw new NotFoundException('Product not found');

    const similar = await this.prisma.product.findMany({
      where: {
        AND: [
          { id: { not: product.id } },
          { isPublished: true },
          { deletedAt: null },
          {
            OR: [
              { categoryId: product.categoryId },
              ...(product.brand ? [{ brand: product.brand }] : []),
              ...(product.tags?.length
                ? [{ tags: { hasSome: product.tags } }]
                : []),
            ],
          },
        ],
      },
      include: {
        variants: {
          where: { stock: { gt: 0 } },
          orderBy: { price: 'asc' },
          take: 1,
          // ← added for shipping calculation
          select: {
            id: true,
            price: true,
            mrp: true,
            stock: true,
            images: true,
            weightInGrams: true,
            length: true,
            width: true,
            height: true,
          },
        },
      },
      take: limit * 3,
    });

    return similar
      .filter((p) => p.variants.length > 0)
      .map((p) => {
        let score = 0;
        if (p.categoryId === product.categoryId) score += 3;
        if (product.brand && p.brand === product.brand) score += 2;
        const overlap = p.tags.filter((t) => product.tags.includes(t)).length;
        score += overlap;

        // ── Shipping Manipulation ────────────────────────────
        const v = p.variants[0];
        const basePrice = Number(v.price);
        const baseMrp = Number(v.mrp);

        let finalPrice = String(basePrice);
        let finalMrp = String(baseMrp);
        let shippingIncluded = false;
        let shippingCharge = 0;

        if (basePrice > 399) {
          const actualG = Number(v.weightInGrams ?? 500);
          const l = parseFloat(v.length?.toString() ?? '0');
          const w = parseFloat(v.width?.toString() ?? '0');
          const h = parseFloat(v.height?.toString() ?? '0');

          const volG = l > 0 && w > 0 && h > 0 ? (l * w * h) / 5 : 0;
          const chargeableG = Math.ceil(Math.max(actualG, volG) / 500) * 500;

          shippingCharge = restOfIndiaRate(chargeableG);
          finalPrice = String(basePrice + shippingCharge);
          finalMrp = String(baseMrp + shippingCharge);
          shippingIncluded = true;
        }
        // ────────────────────────────────────────────────────

        return {
          id: p.id,
          title: p.title,
          slug: p.slug,
          images: p.images,
          brand: p.brand,
          score,
          variant: {
            id: v.id,
            price: finalPrice,
            mrp: finalMrp,
            stock: v.stock,
            image: v.images?.[0] ?? p.images?.[0] ?? null,
            shippingIncluded,
            shippingCharge,
            freeShippingEligible: shippingIncluded,
          },
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
