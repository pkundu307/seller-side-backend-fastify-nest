"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const s3Service_1 = require("./utils/s3Service");
const client_1 = require("@prisma/client");
let ProductsService = class ProductsService {
    prisma;
    s3Service;
    constructor(prisma, s3Service) {
        this.prisma = prisma;
        this.s3Service = s3Service;
    }
    async findBusinessById(businessId) {
        return this.prisma.business.findUnique({
            where: { id: businessId },
            select: { id: true, ownerId: true, name: true },
        });
    }
    async getFeaturedProductsByCategory(categoryId, paginationQuery) {
        const { page = 1, limit = 10 } = paginationQuery;
        const skip = (page - 1) * limit;
        const category = await this.prisma.category.findUnique({
            where: { id: categoryId },
            include: { children: { select: { id: true, name: true, slug: true } } },
        });
        if (!category) {
            throw new common_1.NotFoundException(`Category with ID ${categoryId} not found.`);
        }
        const isParentCategory = category.children.length > 0;
        if (isParentCategory) {
            const childrenWithProducts = await Promise.all(category.children.map(async (child) => {
                const products = await this.prisma.product.findMany({
                    where: {
                        categoryId: child.id,
                        isFeatured: true,
                        isPublished: true,
                    },
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    select: this.getFeaturedProductSelect(),
                });
                return {
                    ...child,
                    products: products.map(this.processProduct),
                };
            }));
            return {
                type: 'parent_category',
                category: { id: category.id, name: category.name, slug: category.slug },
                children: childrenWithProducts,
            };
        }
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
    getFeaturedProductSelect() {
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
                orderBy: [{ isDefault: client_1.Prisma.SortOrder.desc }, { createdAt: client_1.Prisma.SortOrder.asc }],
                select: { price: true, mrp: true, images: true },
            },
        };
    }
    processProduct(product) {
        const mainImages = product.images || [];
        const variantImages = product.variants.length > 0 ? product.variants[0].images || [] : [];
        const combinedImages = [...mainImages, ...variantImages].slice(0, 2);
        const selectedVariant = product.variants.length > 0 ? product.variants[0] : null;
        return {
            id: product.id,
            title: product.title,
            description: product.description,
            slug: product.slug,
            businessName: product.business?.name,
            numberOfReviews: product._count.reviews,
            price: selectedVariant?.price,
            mrp: selectedVariant?.mrp,
            images: combinedImages,
            isCustomizable: product.isCustomizable,
        };
    }
    async createProduct(businessId, formData) {
        const uploadedImageUrls = [];
        try {
            const productImagesUrls = [];
            if (formData.images && formData.images.length > 0) {
                for (const image of formData.images) {
                    const imageUrl = await this.s3Service.uploadImage(image.buffer, image.filename, image.mimetype, "products");
                    productImagesUrls.push(imageUrl);
                    uploadedImageUrls.push(imageUrl);
                }
            }
            const slug = this.generateSlug(formData.title);
            const variantsToCreate = await Promise.all(formData.variants.map(async (variant, index) => {
                const attributeOptionIds = variant.attributes.map((attr) => parseInt(attr.attributeOptionId, 10));
                const chosenOptions = await this.prisma.attributeOption.findMany({
                    where: { id: { in: attributeOptionIds } },
                    select: { id: true, attributeId: true },
                });
                if (chosenOptions.length !== attributeOptionIds.length) {
                    throw new common_1.BadRequestException('One or more provided attributeOptionIds are invalid.');
                }
                const parentAttributeIds = chosenOptions.map((opt) => opt.attributeId);
                if (new Set(parentAttributeIds).size !== parentAttributeIds.length) {
                    throw new common_1.BadRequestException(`Variant with SKU ${variant.sku} cannot have multiple values for the same attribute type.`);
                }
                const attributeValuesToCreate = chosenOptions.map((option) => ({
                    attributeOption: { connect: { id: option.id } },
                    attribute: { connect: { id: option.attributeId } },
                }));
                const variantImageUrls = [];
                const variantImages = formData.variantImagesMap.get(index.toString()) ||
                    formData.variantImagesMap.get(variant.sku) || [];
                for (const imageData of variantImages) {
                    const imageUrl = await this.s3Service.uploadImage(imageData.buffer, imageData.filename, imageData.mimetype, "products");
                    variantImageUrls.push(imageUrl);
                    uploadedImageUrls.push(imageUrl);
                }
                return {
                    sku: variant.sku,
                    price: new client_1.Prisma.Decimal(variant.price),
                    stock: parseInt(variant.stock, 10),
                    mrp: variant.mrp ? new client_1.Prisma.Decimal(variant.mrp) : undefined,
                    hsnCode: variant.hsnCode,
                    images: variantImageUrls,
                    attributeValues: {
                        create: attributeValuesToCreate,
                    },
                };
            }));
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
        }
        catch (error) {
            if (uploadedImageUrls.length > 0) {
                console.error('An error occurred during product creation. Rolling back S3 uploads...');
            }
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    const target = error.meta?.target;
                    if (target.includes('slug'))
                        throw new common_1.BadRequestException('A product with this title already exists.');
                    if (target.includes('sku'))
                        throw new common_1.BadRequestException('One of the provided SKU values is already in use.');
                }
                if (error.code === 'P2025') {
                    throw new common_1.BadRequestException('The provided categoryId or an attributeOptionId does not exist.');
                }
            }
            throw error;
        }
    }
    async getProductsByBusiness(businessId, paginationQuery, userId) {
        const { page = 1, limit = 10 } = paginationQuery;
        const skip = (Number(page) - 1) * Number(limit);
        const business = await this.prisma.business.findUnique({
            where: { id: businessId },
            select: { ownerId: true },
        });
        if (!business)
            throw new common_1.NotFoundException(`Business with ID "${businessId}" not found`);
        if (business.ownerId !== userId)
            throw new common_1.ForbiddenException('You do not have permission to access products for this business.');
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
    async getProductByIdForBusiness(businessId, productId, userId) {
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
            throw new common_1.NotFoundException(`Product with ID "${productId}" not found or you do not have permission to access it.`);
        }
        return product;
    }
    generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }
    async updateProduct(productId, userId, dto, newProductImages, newVariantImagesMap, newModel3dFile, newSlicenseDocumentFile) {
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            include: { business: true, variants: true },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID "${productId}" not found.`);
        }
        if (product.business.ownerId !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to modify this product.');
        }
        const filesToDeleteFromS3 = dto.imagesToDelete || [];
        if (dto.deleteModel3d && product.model3dUrl) {
            filesToDeleteFromS3.push(product.model3dUrl);
        }
        if (dto.deleteSlicenseDocument && product.licenseDocumentUrl) {
            filesToDeleteFromS3.push(product.licenseDocumentUrl);
        }
        if (filesToDeleteFromS3.length > 0) {
            await this.s3Service.deleteImages(filesToDeleteFromS3);
        }
        const newUploadedUrls = [];
        const uploadAndTrack = async (file) => {
            const url = await this.s3Service.uploadImage(file.buffer, file.filename, file.mimetype, "products");
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
            const preparedVariantsData = await Promise.all(dto.variants.map(async (variantDto, index) => {
                const newVariantImages = newVariantImagesMap.get(index.toString()) || [];
                const newVariantImageUrls = await Promise.all(newVariantImages.map(uploadAndTrack));
                const finalVariantImages = [
                    ...(variantDto.images || []).filter(url => !dto.imagesToDelete?.includes(url)),
                    ...newVariantImageUrls,
                ];
                return { dto: variantDto, finalImages: finalVariantImages };
            }));
            return await this.prisma.$transaction(async (tx) => {
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
                const existingVariantIds = product.variants.map((v) => v.id);
                const incomingVariantIds = dto.variants.map((v) => v.id).filter(Boolean);
                const variantsToDelete = existingVariantIds.filter((id) => !incomingVariantIds.includes(id));
                if (variantsToDelete.length > 0) {
                    await tx.variant.deleteMany({ where: { id: { in: variantsToDelete } } });
                }
                for (const preparedVariant of preparedVariantsData) {
                    const variantDto = preparedVariant.dto;
                    const finalImages = preparedVariant.finalImages;
                    const attributeValuesToCreate = variantDto.attributeValues.map((attr) => ({
                        attribute: { connect: { id: attr.attributeId } },
                        attributeOption: { connect: { id: attr.attributeOptionId } },
                    }));
                    if (variantDto.id) {
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
                    }
                    else {
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
                return tx.product.findUnique({
                    where: { id: productId },
                    include: {
                        variants: { include: { attributeValues: { include: { attribute: true, attributeOption: true } } } },
                        category: true,
                    },
                });
            }, { maxWait: 15000, timeout: 30000 });
        }
        catch (error) {
            if (newUploadedUrls.length > 0) {
                console.error('An error occurred. Rolling back S3 uploads:', newUploadedUrls);
            }
            throw error;
        }
    }
    async getInventoryStats(businessId, userId) {
        const business = await this.prisma.business.findUnique({
            where: { id: businessId },
            select: { ownerId: true },
        });
        if (!business) {
            throw new common_1.NotFoundException(`Business with ID "${businessId}" not found.`);
        }
        if (business.ownerId !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to access this business\'s inventory.');
        }
        const lowStockThreshold = 10;
        const statsResult = await this.prisma.$queryRaw `
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
        const stats = statsResult[0];
        return {
            totalStockValue: parseFloat(stats.totalStockValue) || 0,
            negativeStockCount: Number(stats.negativeStockCount) || 0,
            lowStockCount: Number(stats.lowStockCount) || 0,
            outOfStockCount: Number(stats.outOfStockCount) || 0,
        };
    }
    async getProductDetailsForCustomer(productId) {
        const product = await this.prisma.product.findUnique({
            where: {
                id: productId,
                isPublished: true,
            },
            include: {
                business: {
                    select: {
                        id: true,
                        name: true,
                        gstNumber: true,
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
                    orderBy: [
                        { isDefault: 'desc' },
                        { createdAt: 'asc' },
                    ],
                },
                reviews: {
                    take: 10,
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
            throw new common_1.NotFoundException(`Product with ID ${productId} not found or not published.`);
        }
        return product;
    }
    async getCategoryAndAllChildrenIds(categoryId) {
        const result = await this.prisma.$queryRaw `
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
    async getCategoryPageDataBySlug(categorySlug, paginationQuery) {
        const category = await this.prisma.category.findUnique({
            where: { slug: categorySlug },
            include: { children: { select: { id: true, name: true, slug: true } } },
        });
        if (!category) {
            throw new common_1.NotFoundException(`Category with slug "${categorySlug}" not found.`);
        }
        const isParentCategory = category.children.length > 0;
        if (isParentCategory) {
            const childrenWithProducts = await Promise.all(category.children.map(async (child) => {
                const products = await this.prisma.product.findMany({
                    where: {
                        categoryId: child.id,
                        isFeatured: true,
                        isPublished: true,
                    },
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    select: this.getFeaturedProductSelect(),
                });
                return {
                    ...child,
                    products: products.map(this.processProduct),
                };
            }));
            return {
                type: 'parent_category',
                category: { id: category.id, name: category.name, slug: category.slug },
                children: childrenWithProducts,
            };
        }
        else {
            const { page = 1, limit = 10 } = paginationQuery;
            const skip = (page - 1) * limit;
            const products = await this.prisma.product.findMany({
                where: {
                    categoryId: category.id,
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
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        s3Service_1.S3Service])
], ProductsService);
//# sourceMappingURL=products.service.js.map