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
exports.CartService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const s3Service_1 = require("../products/utils/s3Service");
const client_1 = require("@prisma/client");
let CartService = class CartService {
    prisma;
    s3Service;
    constructor(prisma, s3Service) {
        this.prisma = prisma;
        this.s3Service = s3Service;
    }
    async getCartItems(customerUserId) {
        return this.prisma.cartItem.findMany({
            where: { customerUserId },
            include: {
                variant: {
                    select: {
                        id: true,
                        price: true,
                        images: true,
                        attributeValues: {
                            include: {
                                attribute: true,
                                attributeOption: true,
                            },
                        },
                        product: {
                            select: {
                                id: true,
                                title: true,
                                slug: true,
                                images: true,
                            },
                        },
                    },
                },
            },
        });
    }
    async deleteCartItem(customerUserId, cartItemId) {
        const cartItem = await this.prisma.cartItem.findUnique({
            where: { id: cartItemId },
        });
        if (!cartItem || cartItem.customerUserId !== customerUserId) {
            throw new common_1.NotFoundException('Cart item not found or unauthorized.');
        }
        return this.prisma.cartItem.delete({
            where: { id: cartItemId },
        });
    }
    async updateCartItem(customerUserId, cartItemId, dto) {
        const cartItem = await this.prisma.cartItem.findUnique({
            where: { id: cartItemId },
        });
        if (!cartItem || cartItem.customerUserId !== customerUserId) {
            throw new common_1.NotFoundException('Cart item not found or unauthorized.');
        }
        const updateData = {};
        if (dto.quantity !== undefined) {
            if (dto.quantity < 1)
                throw new common_1.BadRequestException('Quantity cannot be less than 1.');
            updateData.quantity = dto.quantity;
        }
        if (dto.customizationImages !== undefined)
            updateData.customizationImages = dto.customizationImages;
        if (dto.customizationDetails !== undefined) {
            try {
                updateData.customizationDetails = dto.customizationDetails
                    ? JSON.parse(dto.customizationDetails)
                    : client_1.Prisma.JsonNull;
            }
            catch {
                throw new common_1.BadRequestException('Invalid JSON in customizationDetails.');
            }
        }
        if (Object.keys(updateData).length === 0)
            throw new common_1.BadRequestException('No valid update fields provided.');
        return this.prisma.cartItem.update({
            where: { id: cartItemId },
            data: updateData,
        });
    }
    async validateProduct(productId, variantId) {
        const product = await this.prisma.product.findUnique({
            where: {
                id: productId,
                isPublished: true
            },
            include: {
                variants: variantId ? { where: { id: variantId } } : false,
            },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID "${productId}" was not found or is not available.`);
        }
        if (variantId && (!product.variants || product.variants.length === 0)) {
            throw new common_1.NotFoundException(`Variant with ID "${variantId}" does not exist for this product.`);
        }
        return product;
    }
    async addItem(customerUserId, dto, customizationFiles) {
        const { productId, variantId, quantity, customizationDetails } = dto;
        if (quantity < 1)
            throw new common_1.BadRequestException('Quantity must be at least 1.');
        const product = await this.validateProduct(productId, variantId);
        const uploadedImageUrls = [];
        if (customizationFiles?.length) {
            for (const file of customizationFiles) {
                const imageUrl = await this.s3Service.uploadImage(file.buffer, file.filename, file.mimetype, "cart");
                uploadedImageUrls.push(imageUrl);
            }
        }
        const parsedDetails = customizationDetails
            ? JSON.parse(customizationDetails)
            : client_1.Prisma.JsonNull;
        if (product.isCustomizable && (uploadedImageUrls.length > 0 || customizationDetails)) {
            console.log(`Product is customizable. Creating new cart entry for product ${productId}.`);
            return this.prisma.cartItem.create({
                data: {
                    customerUserId,
                    productId,
                    variantId,
                    quantity,
                    customizationImages: uploadedImageUrls,
                    customizationDetails: parsedDetails,
                },
            });
        }
        else {
            console.log(`Product is not customizable. Checking for existing cart item for product ${productId}.`);
            const existingCartItem = await this.prisma.cartItem.findFirst({
                where: {
                    customerUserId,
                    productId,
                    variantId: variantId || null,
                },
            });
            console.log(`Existing cart item: ${existingCartItem ? 'Found' : 'Not found'}`);
            if (existingCartItem) {
                return this.prisma.cartItem.update({
                    where: { id: existingCartItem.id },
                    data: {
                        quantity: existingCartItem.quantity + quantity,
                    },
                });
            }
            else {
                return this.prisma.cartItem.create({
                    data: {
                        customerUserId,
                        productId,
                        variantId,
                        quantity,
                        customizationImages: uploadedImageUrls,
                        customizationDetails: parsedDetails,
                    },
                });
            }
        }
    }
};
exports.CartService = CartService;
exports.CartService = CartService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        s3Service_1.S3Service])
], CartService);
//# sourceMappingURL=cart.service.js.map