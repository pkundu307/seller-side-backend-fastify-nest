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
exports.WishlistService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let WishlistService = class WishlistService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async addToWishlist(customerUserId, dto) {
        const { productId } = dto;
        const productExists = await this.prisma.product.findUnique({
            where: { id: productId },
            select: { id: true },
        });
        if (!productExists) {
            throw new common_1.NotFoundException(`Product with ID "${productId}" not found.`);
        }
        try {
            const wishlistItem = await this.prisma.wishlist.create({
                data: {
                    customerUserId,
                    productId,
                },
            });
            return {
                success: true,
                message: 'Product added to wishlist successfully.',
                data: wishlistItem,
            };
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new common_1.ConflictException('This product is already in your wishlist.');
            }
            throw error;
        }
    }
    async getWishlist(customerUserId) {
        const wishlistItems = await this.prisma.wishlist.findMany({
            where: {
                customerUserId,
            },
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                product: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        images: true,
                        category: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
        });
        return wishlistItems.map(item => ({
            wishlistItemId: item.id,
            addedAt: item.createdAt,
            product: {
                id: item.product.id,
                title: item.product.title,
                slug: item.product.slug,
                image: item.product.images.length > 0 ? item.product.images[0] : null,
                category: item.product.category.name,
            }
        }));
    }
    async removeFromWishlist(customerUserId, wishlistItemId) {
        try {
            await this.prisma.wishlist.delete({
                where: {
                    id: wishlistItemId,
                    customerUserId: customerUserId,
                },
            });
            return { success: true, message: 'Item removed from wishlist successfully.' };
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new common_1.NotFoundException(`Wishlist item with ID "${wishlistItemId}" not found or you do not have permission to delete it.`);
            }
            throw error;
        }
    }
};
exports.WishlistService = WishlistService;
exports.WishlistService = WishlistService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WishlistService);
//# sourceMappingURL=wishlist.service.js.map