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
exports.CategoryController = void 0;
const common_1 = require("@nestjs/common");
const category_service_1 = require("./category.service");
const swagger_1 = require("@nestjs/swagger");
const create_category_dto_1 = require("./dto/create-category.dto");
const create_attribute_dto_1 = require("./dto/create-attribute.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let CategoryController = class CategoryController {
    categoriesService;
    constructor(categoriesService) {
        this.categoriesService = categoriesService;
    }
    create(createCategoryDto) {
        return this.categoriesService.createCategory(createCategoryDto);
    }
    getTopLevelCategories() {
        return this.categoriesService.getTopLevelCategories();
    }
    getChildren(parentId) {
        return this.categoriesService.getChildrenByParentId(parentId);
    }
    searchCategories(query) {
        return this.categoriesService.searchCategories(query);
    }
    addAttributes(dto) {
        return this.categoriesService.addAttributesToCategoryBatch(dto);
    }
    getAttributesByCategoryId(categoryId) {
        return this.categoriesService.getAttributesByCategoryId(categoryId);
    }
    getAllCategoriesAsTree() {
        return this.categoriesService.getAllCategoriesAsTree();
    }
};
exports.CategoryController = CategoryController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new category' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Category created successfully.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_category_dto_1.CreateCategoryDto]),
    __metadata("design:returntype", void 0)
], CategoryController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('top-level'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all top-level (parent) categories' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CategoryController.prototype, "getTopLevelCategories", null);
__decorate([
    (0, common_1.Get)('children'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all direct children of a specific category' }),
    (0, swagger_1.ApiQuery)({ name: 'parentId', required: true, description: 'The ID of the parent category' }),
    __param(0, (0, common_1.Query)('parentId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CategoryController.prototype, "getChildren", null);
__decorate([
    (0, common_1.Get)('search'),
    (0, swagger_1.ApiOperation)({ summary: 'Search for categories and get their full path' }),
    (0, swagger_1.ApiQuery)({ name: 'q', required: true, description: 'The search term' }),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CategoryController.prototype, "searchCategories", null);
__decorate([
    (0, common_1.Post)('attributes/batch'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Add multiple attributes to a child-most category in a batch' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'The attributes have been successfully created.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad Request (e.g., not a child-most category, invalid data).' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_attribute_dto_1.AddAttributesBatchDto]),
    __metadata("design:returntype", void 0)
], CategoryController.prototype, "addAttributes", null);
__decorate([
    (0, common_1.Get)(':categoryId/attributes'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all attributes and options for a specific category by its ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns the list of attributes for the category.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Category with the specified ID was not found.' }),
    __param(0, (0, common_1.Param)('categoryId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CategoryController.prototype, "getAttributesByCategoryId", null);
__decorate([
    (0, common_1.Get)('tree'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all categories as a nested tree structure' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns the complete category tree.' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CategoryController.prototype, "getAllCategoriesAsTree", null);
exports.CategoryController = CategoryController = __decorate([
    (0, swagger_1.ApiTags)('Categories'),
    (0, common_1.Controller)('categories'),
    __metadata("design:paramtypes", [category_service_1.CategoryService])
], CategoryController);
//# sourceMappingURL=category.controller.js.map