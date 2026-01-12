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
exports.HomepageAdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const s3Service_1 = require("../products/utils/s3Service");
const homepage_service_1 = require("../homepage/homepage.service");
let HomepageAdminService = class HomepageAdminService {
    prisma;
    s3Service;
    homepageService;
    constructor(prisma, s3Service, homepageService) {
        this.prisma = prisma;
        this.s3Service = s3Service;
        this.homepageService = homepageService;
    }
    async findAllSections() {
        return this.prisma.homepageSection.findMany({
            orderBy: { position: 'asc' },
            include: {
                items: {
                    orderBy: { position: 'asc' },
                },
            },
        });
    }
    async createSection(dto) {
        const section = await this.prisma.homepageSection.create({
            data: {
                ...dto,
                styleConfig: dto.styleConfig ? JSON.parse(dto.styleConfig) : undefined,
            },
        });
        this.homepageService.invalidateCache();
        return section;
    }
    async addItemToSection(sectionId, dto, file) {
        const section = await this.prisma.homepageSection.findUnique({ where: { id: sectionId } });
        if (!section)
            throw new common_1.NotFoundException(`Section with ID ${sectionId} not found.`);
        let imageUrl;
        if (file) {
            imageUrl = await this.s3Service.uploadImage(file.buffer, file.filename, file.mimetype, 'homepage-items');
        }
        return this.prisma.homepageItem.create({
            data: {
                sectionId,
                imageUrl,
                ...dto,
                styleConfig: dto.styleConfig ? JSON.parse(dto.styleConfig) : undefined,
            }
        });
    }
    async updateSection(sectionId, dto) {
        return this.prisma.homepageSection.update({
            where: { id: sectionId },
            data: {
                ...dto,
                styleConfig: dto.styleConfig ? JSON.parse(dto.styleConfig) : undefined,
            },
        });
    }
    async updateItem(itemId, dto, file) {
        const existingItem = await this.prisma.homepageItem.findUnique({ where: { id: itemId } });
        if (!existingItem)
            throw new common_1.NotFoundException(`Item with ID ${itemId} not found.`);
        let imageUrl = existingItem.imageUrl;
        const oldImageUrl = existingItem.imageUrl;
        if (file) {
            imageUrl = await this.s3Service.uploadImage(file.buffer, file.filename, file.mimetype, 'homepage-items');
        }
        const updatedItem = await this.prisma.homepageItem.update({
            where: { id: itemId },
            data: {
                ...dto,
                imageUrl,
                styleConfig: dto.styleConfig ? JSON.parse(dto.styleConfig) : undefined,
            },
        });
        if (file && oldImageUrl) {
            await this.s3Service.deleteImages([oldImageUrl]);
        }
        return updatedItem;
    }
    async deleteItem(itemId) {
        const itemToDelete = await this.prisma.homepageItem.findUnique({ where: { id: itemId } });
        if (!itemToDelete)
            throw new common_1.NotFoundException(`Item with ID ${itemId} not found.`);
        await this.prisma.homepageItem.delete({ where: { id: itemId } });
        if (itemToDelete.imageUrl) {
            await this.s3Service.deleteImages([itemToDelete.imageUrl]);
        }
        return { success: true, message: 'Item deleted successfully.' };
    }
    async deleteSection(sectionId) {
        const sectionToDelete = await this.prisma.homepageSection.findUnique({
            where: { id: sectionId },
            include: { items: true },
        });
        if (!sectionToDelete)
            throw new common_1.NotFoundException(`Section with ID ${sectionId} not found.`);
        const imagesToDelete = sectionToDelete.items
            .map(item => item.imageUrl)
            .filter((url) => !!url);
        await this.prisma.$transaction([
            this.prisma.homepageItem.deleteMany({ where: { sectionId } }),
            this.prisma.homepageSection.delete({ where: { id: sectionId } }),
        ]);
        if (imagesToDelete.length > 0) {
            await this.s3Service.deleteImages(imagesToDelete);
        }
        return { success: true, message: 'Section and its items deleted successfully.' };
    }
    async updateItemStatus(itemId, dto) {
        return this.prisma.homepageItem.update({
            where: { id: itemId },
            data: { isActive: dto.isActive },
        });
    }
    async updateSectionStatus(sectionId, dto) {
        return this.prisma.homepageSection.update({
            where: { id: sectionId },
            data: { isActive: dto.isActive },
        });
    }
    async reorderSections(dto) {
        return this.prisma.$transaction(dto.items.map(item => this.prisma.homepageSection.update({
            where: { id: item.id },
            data: { position: item.position },
        })));
    }
    async reorderItems(dto) {
        return this.prisma.$transaction(dto.items.map(item => this.prisma.homepageItem.update({
            where: { id: item.id },
            data: { position: item.position },
        })));
    }
};
exports.HomepageAdminService = HomepageAdminService;
exports.HomepageAdminService = HomepageAdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        s3Service_1.S3Service,
        homepage_service_1.HomepageService])
], HomepageAdminService);
//# sourceMappingURL=homepage-admin.service.js.map