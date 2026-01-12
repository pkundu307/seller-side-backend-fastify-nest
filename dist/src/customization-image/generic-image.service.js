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
exports.GenericImageService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const s3Service_1 = require("../products/utils/s3Service");
let GenericImageService = class GenericImageService {
    prisma;
    s3Service;
    constructor(prisma, s3Service) {
        this.prisma = prisma;
        this.s3Service = s3Service;
    }
    async addImages(dto, files) {
        const imageUrlsFromString = dto.imageUrls ? JSON.parse(dto.imageUrls) : [];
        if (imageUrlsFromString.length > 0 && files && files.length > 0) {
            throw new common_1.BadRequestException('Provide either imageUrls or imageFiles, but not both.');
        }
        if (imageUrlsFromString.length === 0 && (!files || files.length === 0)) {
            throw new common_1.BadRequestException('You must provide at least one image URL or upload at least one file.');
        }
        let finalImageUrls = [];
        const uploadedUrlsForRollback = [];
        try {
            if (files && files.length > 0) {
                const uploadPromises = files.map(file => this.s3Service.uploadImage(file.buffer, file.filename, file.mimetype, "assets"));
                finalImageUrls = await Promise.all(uploadPromises);
                uploadedUrlsForRollback.push(...finalImageUrls);
            }
            else {
                finalImageUrls = imageUrlsFromString;
            }
            const dbPayload = finalImageUrls.map(url => ({
                categoryOrSubcategoryId: dto.categoryOrSubcategoryId,
                type: dto.type,
                url: url,
            }));
            const result = await this.prisma.categoryOrSubcategoryImage.createMany({
                data: dbPayload,
            });
            return {
                success: true,
                message: `${result.count} images added successfully.`,
                count: result.count,
            };
        }
        catch (error) {
            if (uploadedUrlsForRollback.length > 0) {
                console.error('Operation failed. Rolling back S3 uploads:', uploadedUrlsForRollback);
                await this.s3Service.deleteImages(uploadedUrlsForRollback);
            }
            throw error;
        }
    }
    async deleteImage(id) {
        const image = await this.prisma.categoryOrSubcategoryImage.findUnique({
            where: { id },
        });
        if (!image) {
            throw new common_1.NotFoundException(`Image with ID "${id}" not found.`);
        }
        await this.prisma.categoryOrSubcategoryImage.delete({ where: { id } });
        if (image.url.includes('.s3.')) {
            try {
                await this.s3Service.deleteImages([image.url]);
            }
            catch (s3Error) {
                console.error(`Successfully deleted image ID ${id} from DB, but failed to delete S3 object.`, { url: image.url, error: s3Error });
            }
        }
        return { success: true, message: 'Image deleted successfully.' };
    }
};
exports.GenericImageService = GenericImageService;
exports.GenericImageService = GenericImageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        s3Service_1.S3Service])
], GenericImageService);
//# sourceMappingURL=generic-image.service.js.map