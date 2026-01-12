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
exports.UserPredefinedAssetsController = void 0;
const common_1 = require("@nestjs/common");
const predefined_assets_service_1 = require("./predefined-assets.service");
const swagger_1 = require("@nestjs/swagger");
let UserPredefinedAssetsController = class UserPredefinedAssetsController {
    assetsService;
    validationPipe;
    constructor(assetsService, validationPipe) {
        this.assetsService = assetsService;
        this.validationPipe = validationPipe;
    }
    getAllCategories() {
        return this.assetsService.getAllCategories();
    }
    getSubCategoriesByCategoryId(categoryId) {
        return this.assetsService.getSubCategoriesByCategoryId(categoryId);
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
exports.UserPredefinedAssetsController = UserPredefinedAssetsController;
__decorate([
    (0, common_1.Get)('categories'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all predefined categories' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UserPredefinedAssetsController.prototype, "getAllCategories", null);
__decorate([
    (0, common_1.Get)('categories/:categoryId/subcategories'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all subcategories for a specific category' }),
    __param(0, (0, common_1.Param)('categoryId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UserPredefinedAssetsController.prototype, "getSubCategoriesByCategoryId", null);
__decorate([
    (0, common_1.Get)('subcategories/:subCategoryId/images'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all images for a specific subcategory' }),
    __param(0, (0, common_1.Param)('subCategoryId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UserPredefinedAssetsController.prototype, "getImagesBySubCategoryId", null);
exports.UserPredefinedAssetsController = UserPredefinedAssetsController = __decorate([
    (0, swagger_1.ApiTags)('user - Predefined Customization Assets'),
    (0, common_1.Controller)('user/predefined-assets'),
    __metadata("design:paramtypes", [predefined_assets_service_1.PredefinedAssetsService,
        common_1.ValidationPipe])
], UserPredefinedAssetsController);
//# sourceMappingURL=customization-image-for-user.controller.js.map