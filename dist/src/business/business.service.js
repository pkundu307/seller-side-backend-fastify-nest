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
exports.BusinessService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const slugify_1 = require("../utils/slugify");
const client_1 = require("@prisma/client");
let BusinessService = class BusinessService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createBusiness(dto, ownerId) {
        let slug = (0, slugify_1.slugify)(dto.name);
        const existingSlug = await this.prisma.business.findUnique({ where: { slug } });
        if (existingSlug) {
            slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
        }
        try {
            const business = await this.prisma.business.create({
                data: {
                    ...dto,
                    ownerId,
                    slug,
                },
            });
            return business;
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    const target = error.meta?.target;
                    if (target && target.includes('gstNumber')) {
                        throw new common_1.ConflictException('A business with this GST Number already exists.');
                    }
                }
            }
            throw new common_1.InternalServerErrorException('Could not create business');
        }
    }
    async getAllBusinesses(ownerId) {
        return this.prisma.business.findMany({
            where: { ownerId },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { products: true }
                }
            }
        });
    }
    async getBusinessById(businessId) {
        const business = await this.prisma.business.findUnique({
            where: { id: businessId },
        });
        if (!business) {
            throw new common_1.NotFoundException('Business not found');
        }
        return business;
    }
    async getBusinessBySlug(slug) {
        const business = await this.prisma.business.findUnique({
            where: { slug },
            include: {
                products: { take: 10 }
            }
        });
        if (!business) {
            throw new common_1.NotFoundException('Business not found');
        }
        return business;
    }
    async updateBusiness(businessId, ownerId, data) {
        const business = await this.prisma.business.findFirst({
            where: { id: businessId, ownerId }
        });
        if (!business) {
            throw new common_1.NotFoundException('Business not found or you do not have permission');
        }
        return this.prisma.business.update({
            where: { id: businessId },
            data: {
                ...data,
            }
        });
    }
};
exports.BusinessService = BusinessService;
exports.BusinessService = BusinessService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BusinessService);
//# sourceMappingURL=business.service.js.map