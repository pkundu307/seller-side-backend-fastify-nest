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
exports.ProductsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const products_service_1 = require("./products.service");
const pagination_query_dto_1 = require("./dto/pagination-query.dto");
const swagger_1 = require("@nestjs/swagger");
const update_product_dto_1 = require("./dto/update-product.dto");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
let ProductsController = class ProductsController {
    productsService;
    constructor(productsService) {
        this.productsService = productsService;
    }
    async addProduct(req, businessId) {
        try {
            const user = req.user;
            console.log('[CONTROLLER] User:', user);
            const business = await this.productsService.findBusinessById(businessId);
            if (!business) {
                throw new common_1.NotFoundException('Business not found');
            }
            if (business.ownerId !== user.id) {
                throw new common_1.ForbiddenException('You do not have permission for this business');
            }
            console.log('[CONTROLLER] Business check passed:', business.name);
            const formData = await this.parseMultipartData(req);
            console.log('[CONTROLLER] Parsed formData:', JSON.stringify(formData, null, 2));
            console.log('[CONTROLLER] Running validation...');
            this.validateProductData(formData);
            console.log('[CONTROLLER] Validation passed.');
            console.log('[CONTROLLER] Calling productsService.createProduct...');
            const result = await this.productsService.createProduct(businessId, formData);
            console.log('[CONTROLLER] productsService.createProduct SUCCEEDED.');
            return result;
        }
        catch (error) {
            console.error('[CONTROLLER] An error occurred in addProduct:', error);
            throw error;
        }
    }
    async parseMultipartData(req) {
        if (!req.isMultipart()) {
            throw new common_1.BadRequestException('Request is not multipart/form-data.');
        }
        const formData = { variants: [] };
        const productImages = [];
        const variantImagesMap = new Map();
        for await (const part of req.parts()) {
            if ('value' in part) {
                if (part.fieldname === 'variants') {
                    try {
                        formData.variants = JSON.parse(part.value);
                    }
                    catch {
                        throw new common_1.BadRequestException('Invalid JSON format for the "variants" field.');
                    }
                }
                else {
                    formData[part.fieldname] = part.value;
                }
            }
            else {
                const buffer = await part.toBuffer();
                if (part.fieldname === 'images') {
                    productImages.push({ buffer, filename: part.filename, mimetype: part.mimetype });
                }
                else if (part.fieldname.startsWith('variantImages_')) {
                    const variantId = part.fieldname.replace('variantImages_', '');
                    if (!variantImagesMap.has(variantId)) {
                        variantImagesMap.set(variantId, []);
                    }
                    variantImagesMap.get(variantId).push({ buffer, filename: part.filename, mimetype: part.mimetype });
                }
            }
        }
        formData.images = productImages;
        formData.variantImagesMap = variantImagesMap;
        return formData;
    }
    validateProductData(formData) {
        const { title, categoryId, variants, images } = formData;
        if (!title)
            throw new common_1.BadRequestException('Product title is required.');
        if (!categoryId || isNaN(parseInt(categoryId, 10)))
            throw new common_1.BadRequestException('A valid categoryId is required.');
        if (!images || images.length === 0)
            throw new common_1.BadRequestException('At least one product image is required.');
        if (!Array.isArray(variants) || variants.length === 0)
            throw new common_1.BadRequestException('At least one variant is required.');
        for (const variant of variants) {
            if (!variant.sku)
                throw new common_1.BadRequestException('Each variant must have a SKU.');
            if (!variant.price || isNaN(parseFloat(variant.price)))
                throw new common_1.BadRequestException(`Variant with SKU ${variant.sku} must have a valid price.`);
            if (!variant.stock || isNaN(parseInt(variant.stock, 10)))
                throw new common_1.BadRequestException(`Variant with SKU ${variant.sku} must have a valid stock count.`);
            if (!Array.isArray(variant.attributes) ||
                variant.attributes.length === 0) {
                throw new common_1.BadRequestException(`Variant with SKU ${variant.sku} must have at least one attribute.`);
            }
            for (const attr of variant.attributes) {
                if (!attr.attributeOptionId ||
                    isNaN(parseInt(attr.attributeOptionId, 10))) {
                }
            }
        }
    }
    async getProductsForBusiness(businessId, req, paginationQuery) {
        const user = req.user;
        return this.productsService.getProductsByBusiness(businessId, paginationQuery, user.id);
    }
    async getProductById(req, businessId, productId) {
        const user = req.user;
        return this.productsService.getProductByIdForBusiness(businessId, productId, user.id);
    }
    async updateProduct(productId, req) {
        if (!req.isMultipart()) {
            throw new common_1.BadRequestException('Request must be multipart/form-data for product updates.');
        }
        const user = req.user;
        const formData = await this.parseMultipartUpdateData(req);
        const validationErrors = await (0, class_validator_1.validate)(formData.dto);
        if (validationErrors.length > 0) {
            throw new common_1.BadRequestException(validationErrors);
        }
        return this.productsService.updateProduct(productId, user.id, formData.dto, formData.newProductImages, formData.newVariantImagesMap, formData.newModel3dFile, formData.newSlicenseDocumentFile);
    }
    async parseMultipartUpdateData(req) {
        const fields = {};
        const newProductImages = [];
        const newVariantImagesMap = new Map();
        let newModel3dFile;
        let newSlicenseDocumentFile;
        for await (const part of req.parts()) {
            if ('value' in part) {
                fields[part.fieldname] = part.value;
            }
            else {
                const buffer = await part.toBuffer();
                const fileData = { buffer, filename: part.filename, mimetype: part.mimetype };
                if (part.fieldname === 'images') {
                    newProductImages.push(fileData);
                }
                else if (part.fieldname.startsWith('variantImages_')) {
                    const variantIndex = part.fieldname.replace('variantImages_', '');
                    if (!newVariantImagesMap.has(variantIndex)) {
                        newVariantImagesMap.set(variantIndex, []);
                    }
                    newVariantImagesMap.get(variantIndex).push(fileData);
                }
                else if (part.fieldname === 'model3d') {
                    newModel3dFile = fileData;
                }
                else if (part.fieldname === 'slicenseDocument') {
                    newSlicenseDocumentFile = fileData;
                }
            }
        }
        const dtoData = {
            title: fields.title,
            description: fields.description,
            isFeatured: fields.isFeatured === 'true',
            isCustomizable: fields.isCustomizable === 'true',
            variants: fields.variants ? JSON.parse(fields.variants) : [],
            imagesToDelete: fields.imagesToDelete ? JSON.parse(fields.imagesToDelete) : [],
            customizationConfig: fields.customizationConfig,
            deleteModel3d: fields.deleteModel3d === 'true',
            deleteSlicenseDocument: fields.deleteSlicenseDocument === 'true',
        };
        const dto = (0, class_transformer_1.plainToInstance)(update_product_dto_1.UpdateProductDto, dtoData);
        return {
            dto,
            newProductImages,
            newVariantImagesMap,
            newModel3dFile,
            newSlicenseDocumentFile,
        };
    }
    async getDashboardStats(businessId, req) {
        const user = req.user;
        return this.productsService.getInventoryStats(businessId, user.id);
    }
    async getFeaturedProductsByCategory(categoryId, paginationQuery) {
        const id = parseInt(categoryId, 10);
        if (isNaN(id)) {
            throw new common_1.BadRequestException('Invalid category ID provided. Must be a number.');
        }
        return this.productsService.getFeaturedProductsByCategory(id, paginationQuery);
    }
    async getProductDetailsForCustomer(productId) {
        return this.productsService.getProductDetailsForCustomer(productId);
    }
    async getCategoryPageData(slug, paginationQuery) {
        return this.productsService.getCategoryPageDataBySlug(slug, paginationQuery);
    }
};
exports.ProductsController = ProductsController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('add/:businessId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('businessId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "addProduct", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('business/:businessId'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true, whitelist: true })),
    __param(0, (0, common_1.Param)('businessId')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, pagination_query_dto_1.PaginationQueryDto]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getProductsForBusiness", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('business/:businessId/:productId'),
    (0, swagger_1.ApiBearerAuth)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('businessId')),
    __param(2, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getProductById", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Patch)(':productId'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update a product and its variants' }),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "updateProduct", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('stats/:businessId'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get key inventory statistics for a business' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns inventory dashboard statistics.',
    }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Business not found.' }),
    __param(0, (0, common_1.Param)('businessId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getDashboardStats", null);
__decorate([
    (0, common_1.Get)('featured/category/:categoryId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get all featured products by category with reduced details (Customer-facing)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns a list of featured products with minimal details.',
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid category ID provided.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Category not found.' }),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true, whitelist: true })),
    __param(0, (0, common_1.Param)('categoryId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, pagination_query_dto_1.PaginationQueryDto]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getFeaturedProductsByCategory", null);
__decorate([
    (0, common_1.Get)('public/:productId'),
    (0, swagger_1.ApiOperation)({ summary: 'Customer: Get comprehensive details of a single product by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns full details of a published product.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Product not found or not published.' }),
    __param(0, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getProductDetailsForCustomer", null);
__decorate([
    (0, common_1.Get)('category-page/:slug'),
    (0, swagger_1.ApiOperation)({ summary: 'Get data for a category page (handles parent/child logic)' }),
    (0, swagger_1.ApiParam)({ name: 'slug', description: 'The unique slug of the category' }),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, pagination_query_dto_1.PaginationQueryDto]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getCategoryPageData", null);
exports.ProductsController = ProductsController = __decorate([
    (0, common_1.Controller)('products'),
    __metadata("design:paramtypes", [products_service_1.ProductsService])
], ProductsController);
//# sourceMappingURL=products.controller.js.map