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
exports.PredefinedAssetsController = void 0;
const common_1 = require("@nestjs/common");
const predefined_assets_service_1 = require("./predefined-assets.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const swagger_1 = require("@nestjs/swagger");
const create_categories_dto_1 = require("./dto/create-categories.dto");
const create_subcategories_dto_1 = require("./dto/create-subcategories.dto");
const add_subcategory_images_dto_1 = require("./dto/add-subcategory-images.dto");
let PredefinedAssetsController = class PredefinedAssetsController {
    assetsService;
    validationPipe;
    constructor(assetsService, validationPipe) {
        this.assetsService = assetsService;
        this.validationPipe = validationPipe;
    }
    createCategories(dto) {
        return this.assetsService.createCategories(dto);
    }
    getAllCategories() {
        return this.assetsService.getAllCategories();
    }
    createSubCategories(dto) {
        return this.assetsService.createSubCategories(dto);
    }
    getSubCategoriesByCategoryId(categoryId) {
        return this.assetsService.getSubCategoriesByCategoryId(categoryId);
    }
    async addImagesToSubCategory(req) {
        const { rawDto, files } = await this.parseMultipartRequest(req);
        const dto = await this.validationPipe.transform(rawDto, {
            type: 'body',
            metatype: add_subcategory_images_dto_1.AddSubCategoryImagesDto,
        });
        return this.assetsService.addImagesToSubCategory(dto, files);
    }
    getImagesBySubCategoryId(subCategoryId) {
        return this.assetsService.getImagesBySubCategoryId(subCategoryId);
    }
    async parseMultipartRequest(req) {
        if (!req.isMultipart())
            throw new common_1.BadRequestException('Request is not multipart/form-data.');
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
exports.PredefinedAssetsController = PredefinedAssetsController;
__decorate([
    (0, common_1.Post)('categories'),
    (0, swagger_1.ApiOperation)({ summary: 'Create one or more new categories' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_categories_dto_1.CreateCategoriesDto]),
    __metadata("design:returntype", void 0)
], PredefinedAssetsController.prototype, "createCategories", null);
__decorate([
    (0, common_1.Get)('categories'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all predefined categories' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PredefinedAssetsController.prototype, "getAllCategories", null);
__decorate([
    (0, common_1.Post)('subcategories'),
    (0, swagger_1.ApiOperation)({ summary: 'Create one or more new subcategories under a parent category' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_subcategories_dto_1.CreateSubCategoriesDto]),
    __metadata("design:returntype", void 0)
], PredefinedAssetsController.prototype, "createSubCategories", null);
__decorate([
    (0, common_1.Get)('categories/:categoryId/subcategories'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all subcategories for a specific category' }),
    __param(0, (0, common_1.Param)('categoryId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PredefinedAssetsController.prototype, "getSubCategoriesByCategoryId", null);
__decorate([
    (0, common_1.Post)('subcategory-images'),
    (0, swagger_1.ApiOperation)({ summary: 'Add multiple images to a subcategory' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({ type: add_subcategory_images_dto_1.AddSubCategoryImagesDto }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PredefinedAssetsController.prototype, "addImagesToSubCategory", null);
__decorate([
    (0, common_1.Get)('subcategories/:subCategoryId/images'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all images for a specific subcategory' }),
    __param(0, (0, common_1.Param)('subCategoryId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PredefinedAssetsController.prototype, "getImagesBySubCategoryId", null);
exports.PredefinedAssetsController = PredefinedAssetsController = __decorate([
    (0, swagger_1.ApiTags)('Admin - Predefined Customization Assets'),
    (0, common_1.Controller)('admin/predefined-assets'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [predefined_assets_service_1.PredefinedAssetsService,
        common_1.ValidationPipe])
], PredefinedAssetsController);
//# sourceMappingURL=customization-image.controller.js.map