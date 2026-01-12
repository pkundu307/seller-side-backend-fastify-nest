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
exports.S3Service = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const crypto_1 = require("crypto");
const common_1 = require("@nestjs/common");
let S3Service = class S3Service {
    s3;
    bucketName;
    accountId;
    allowedFolders = ['products', 'banners', 'avatars', 'categories', 'others', 'cart', 'assets', 'homepage-items'];
    constructor() {
        const secretAccessKey = process.env.R2_SECRET_KEY;
        const accessKeyId = process.env.R2_ACCESS_KEY;
        const bucketName = process.env.R2_BUCKET;
        const accountId = process.env.R2_ACCOUNT_ID;
        const endpoint = process.env.R2_ENDPOINT;
        if (!secretAccessKey)
            throw new Error('R2_SECRET_KEY missing');
        if (!accessKeyId)
            throw new Error('R2_ACCESS_KEY missing');
        if (!bucketName)
            throw new Error('R2_BUCKET missing');
        if (!accountId)
            throw new Error('R2_ACCOUNT_ID missing');
        if (!endpoint)
            throw new Error('R2_ENDPOINT missing');
        this.bucketName = bucketName;
        this.accountId = accountId;
        this.s3 = new client_s3_1.S3Client({
            region: 'auto',
            endpoint,
            credentials: { accessKeyId, secretAccessKey },
        });
    }
    validateFolder(folder) {
        if (!folder || typeof folder !== 'string') {
            throw new common_1.BadRequestException('Folder name is required.');
        }
        if (!this.allowedFolders.includes(folder)) {
            throw new common_1.BadRequestException(`Invalid folder "${folder}". Allowed folders: ${this.allowedFolders.join(', ')}`);
        }
    }
    async uploadImage(fileBuffer, fileName, mimeType, folder) {
        this.validateFolder(folder);
        const uniqueKey = `${folder}/${(0, crypto_1.randomUUID)()}-${fileName}`;
        const command = new client_s3_1.PutObjectCommand({
            Bucket: this.bucketName,
            Key: uniqueKey,
            Body: fileBuffer,
            ContentType: mimeType,
        });
        await this.s3.send(command);
        return `${process.env.R2_PUBLIC_URL}/${uniqueKey}`;
    }
    async deleteImages(imageUrls) {
        if (!imageUrls || imageUrls.length === 0)
            return;
        const objectsToDelete = imageUrls.map((url) => {
            const key = url.replace(`${process.env.R2_PUBLIC_URL}/`, '');
            return { Key: key };
        });
        try {
            const command = new client_s3_1.DeleteObjectsCommand({
                Bucket: this.bucketName,
                Delete: {
                    Objects: objectsToDelete,
                    Quiet: false,
                },
            });
            const response = await this.s3.send(command);
            if (response.Errors?.length) {
                console.error('R2 delete errors:', response.Errors);
                throw new common_1.InternalServerErrorException('Some images could not be deleted from R2.');
            }
        }
        catch (error) {
            console.error('R2 delete error:', error);
            throw new common_1.InternalServerErrorException('Failed to delete images from R2.');
        }
    }
};
exports.S3Service = S3Service;
exports.S3Service = S3Service = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], S3Service);
//# sourceMappingURL=s3Service.js.map