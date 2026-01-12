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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericImageController = void 0;
const common_1 = require("@nestjs/common");
const generic_image_service_1 = require("./generic-image.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const swagger_1 = require("@nestjs/swagger");
const create_generic_image_dto_1 = require("./dto/create-generic-image.dto");
let GenericImageController = class GenericImageController {
    genericImageService;
    validationPipe;
    constructor(genericImageService, validationPipe) {
        this.genericImageService = genericImageService;
        this.validationPipe = validationPipe;
    }
    async addImages(req) {
        const { rawDto, files } = await this.parseMultipartRequest(req);
        const dto = await this.validationPipe.transform(rawDto, {
            type: 'body',
            metatype: create_generic_image_dto_1.AddGenericImagesDto,
        });
        return this.genericImageService.addImages(dto, files);
    }
    deleteImage(id) {
        return this.genericImageService.deleteImage(id);
    }
    async parseMultipartRequest(req) {
        if (!req.isMultipart()) {
            throw new common_1.BadRequestException('Request is not multipart/form-data.');
        }
        const rawDto = {};
        const files = [];
        for await (const part of req.parts()) {
            if (part.file && part.fieldname === 'imageFiles') {
                const buffer = await part.toBuffer();
                if (buffer.length > 0) {
                    files.push({ buffer, filename: part.filename, mimetype: part.mimetype });
                }
            }
            else if (part.value !== undefined && part.value !== '') {
                rawDto[part.fieldname] = part.value;
            }
        }
        return { rawDto, files };
    }
};
exports.GenericImageController = GenericImageController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Add one or more images for a category/subcategory' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['categoryOrSubcategoryId', 'type'],
            properties: {
                categoryOrSubcategoryId: { type: 'string', format: 'uuid' },
                type: { type: 'string', enum: ['category', 'subcategory'] },
                imageUrls: {
                    type: 'string',
                    description: 'A JSON string array of web URLs. Provide this OR imageFiles.',
                    example: '["https://example.com/img1.png"]'
                },
                imageFiles: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                    description: 'One or more image files to upload. Provide this OR imageUrls.'
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Images added successfully.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad Request. Missing or invalid data.' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GenericImageController.prototype, "addImages", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a generic image by its own ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Image deleted successfully.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Image not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GenericImageController.prototype, "deleteImage", null);
exports.GenericImageController = GenericImageController = __decorate([
    (0, swagger_1.ApiTags)('Admin - Generic Images'),
    (0, common_1.Controller)('admin/generic-images'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [generic_image_service_1.GenericImageService,
        common_1.ValidationPipe])
], GenericImageController);
//# sourceMappingURL=generic-image.controller.js.map