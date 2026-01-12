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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const s3Service_1 = require("../products/utils/s3Service");
let AdminService = class AdminService {
    prisma;
    s3Service;
    constructor(prisma, s3Service) {
        this.prisma = prisma;
        this.s3Service = s3Service;
    }
    async getDashboardStats() {
        const [totalUsers, totalBusinesses, totalProducts] = await this.prisma.$transaction([
            this.prisma.user.count(),
            this.prisma.business.count(),
            this.prisma.product.count(),
        ]);
        return {
            totalUsers,
            totalBusinesses,
            totalProducts,
        };
    }
    async getFeaturedProducts() {
        const featuredProducts = await this.prisma.product.findMany({
            where: {
                isFeatured: true,
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
                business: {
                    select: {
                        id: true,
                        name: true,
                        city: true,
                        state: true,
                        isVerified: true,
                        owner: {
                            select: {
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                variants: {
                    where: {
                        isDefault: true,
                    },
                    select: {
                        price: true,
                        stock: true,
                        status: true,
                    },
                    take: 1,
                },
                _count: {
                    select: {
                        variants: true,
                    },
                },
            },
            orderBy: [
                {
                    category: {
                        name: 'asc',
                    },
                },
                {
                    createdAt: 'desc',
                },
            ],
        });
        const categoriesMap = new Map();
        featuredProducts.forEach((product) => {
            const categoryId = product.category.id;
            if (!categoriesMap.has(categoryId)) {
                categoriesMap.set(categoryId, {
                    categoryId: product.category.id,
                    categoryName: product.category.name,
                    categorySlug: product.category.slug,
                    products: [],
                });
            }
            const formattedProduct = {
                id: product.id,
                title: product.title,
                description: product.description,
                slug: product.slug,
                images: product.images,
                isPublished: product.isPublished,
                createdAt: product.createdAt,
                updatedAt: product.updatedAt,
                business: {
                    id: product.business.id,
                    name: product.business.name,
                    city: product.business.city,
                    state: product.business.state,
                    isVerified: product.business.isVerified,
                    owner: product.business.owner,
                },
                variantCount: product._count.variants,
                defaultVariant: product.variants.length > 0 ? {
                    price: Number(product.variants[0].price),
                    stock: product.variants[0].stock,
                    status: product.variants[0].status,
                } : null,
            };
            categoriesMap.get(categoryId).products.push(formattedProduct);
        });
        const categories = Array.from(categoriesMap.values()).sort((a, b) => a.categoryName.localeCompare(b.categoryName));
        return {
            categories,
            totalFeaturedProducts: featuredProducts.length,
        };
    }
    async createBanner(dto, files) {
        if (!files.bannerImage) {
            throw new common_1.BadRequestException('A banner image is required.');
        }
        const bannerImageFile = files.bannerImage;
        const brandLogoFile = files.brandLogo;
        const uploadedImageUrls = [];
        try {
            const bannerImageUrl = await this.s3Service.uploadImage(bannerImageFile.buffer, bannerImageFile.filename, bannerImageFile.mimetype, "banners");
            uploadedImageUrls.push(bannerImageUrl);
            let brandLogoUrl = undefined;
            if (brandLogoFile) {
                brandLogoUrl = await this.s3Service.uploadImage(brandLogoFile.buffer, brandLogoFile.filename, brandLogoFile.mimetype, "banners");
                uploadedImageUrls.push(brandLogoUrl);
            }
            const banner = await this.prisma.promotionalBanner.create({
                data: {
                    title: dto.title,
                    discountText: dto.discountText,
                    targetUrl: dto.targetUrl,
                    position: dto.position,
                    bannerImageUrl: bannerImageUrl,
                    brandLogoUrl: brandLogoUrl,
                },
            });
            return {
                success: true,
                message: 'Promotional banner created successfully.',
                data: banner,
            };
        }
        catch (error) {
            if (uploadedImageUrls.length > 0) {
                console.error(`Database error after file upload. Rolling back S3 objects: ${uploadedImageUrls.join(', ')}`);
                this.s3Service.deleteImages(uploadedImageUrls);
            }
            throw error;
        }
    }
    async deleteBanner(bannerId) {
        const banner = await this.prisma.promotionalBanner.findUnique({
            where: { id: bannerId },
        });
        if (!banner) {
            throw new common_1.NotFoundException(`Banner with ID ${bannerId} not found.`);
        }
        const imagesToDelete = [];
        if (banner.bannerImageUrl) {
            imagesToDelete.push(banner.bannerImageUrl);
        }
        if (banner.brandLogoUrl) {
            imagesToDelete.push(banner.brandLogoUrl);
        }
        await this.prisma.promotionalBanner.delete({
            where: { id: bannerId },
        });
        if (imagesToDelete.length > 0) {
            try {
                await this.s3Service.deleteImages(imagesToDelete);
            }
            catch (s3Error) {
                console.error(`Successfully deleted banner ID ${bannerId} from DB, but failed to delete associated S3 images.`, { urls: imagesToDelete, error: s3Error });
            }
        }
        return {
            success: true,
            message: `Banner with ID ${bannerId} has been deleted successfully.`,
        };
    }
    async getAllBusinesses() {
        const businesses = await this.prisma.business.findMany({
            select: {
                id: true,
                name: true,
                city: true,
                state: true,
                phone: true,
                category: true,
                isVerified: true,
                createdAt: true,
                owner: {
                    select: {
                        email: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return businesses;
    }
    async updateBusinessVerification(businessId, dto) {
        const businessExists = await this.prisma.business.findUnique({
            where: { id: businessId },
        });
        if (!businessExists) {
            throw new common_1.NotFoundException(`Business with ID "${businessId}" not found.`);
        }
        return this.prisma.business.update({
            where: { id: businessId },
            data: {
                isVerified: dto.isVerified,
            },
        });
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        s3Service_1.S3Service])
], AdminService);
//# sourceMappingURL=admin.service.js.map