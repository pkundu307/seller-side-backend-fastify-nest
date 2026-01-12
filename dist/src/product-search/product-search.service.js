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
exports.ProductSearchService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ProductSearchService = class ProductSearchService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async searchProducts(dto) {
        const { query, categoryId, productId } = dto;
        const trimmedQuery = query?.trim();
        if (!trimmedQuery && !categoryId && !productId) {
            return [];
        }
        const where = {
            isPublished: true,
            ...(categoryId && { categoryId: parseInt(categoryId, 10) }),
        };
        if (trimmedQuery) {
            let matchingProductIds = await this.prisma.$queryRaw `
        SELECT id FROM "Product"
        WHERE search_vector @@ plainto_tsquery('english', ${trimmedQuery})
      `;
            if (matchingProductIds.length === 0) {
                matchingProductIds = await this.prisma.$queryRaw `
          SELECT id FROM "Product"
          WHERE title % ${trimmedQuery}
          LIMIT 20
        `;
            }
            const foundIds = matchingProductIds.map((p) => p.id);
            if (foundIds.length === 0) {
                return [];
            }
            if (productId) {
                if (!foundIds.includes(productId)) {
                    return [];
                }
                where.id = productId;
            }
            else {
                where.id = { in: foundIds };
            }
        }
        else if (productId) {
            where.id = productId;
        }
        const products = await this.prisma.product.findMany({
            where,
            take: 20,
            select: {
                id: true,
                title: true,
                slug: true,
                images: true,
                category: {
                    select: { name: true },
                },
                variants: {
                    orderBy: { isDefault: 'desc' },
                    take: 1,
                    select: {
                        id: true,
                        price: true,
                        images: true,
                        mrp: true,
                    },
                },
            },
        });
        return products;
    }
};
exports.ProductSearchService = ProductSearchService;
exports.ProductSearchService = ProductSearchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductSearchService);
//# sourceMappingURL=product-search.service.js.map