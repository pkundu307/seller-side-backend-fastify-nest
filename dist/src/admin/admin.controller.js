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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const admin_service_1 = require("./admin.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const swagger_1 = require("@nestjs/swagger");
const create_banner_dto_1 = require("./dto/create-banner.dto");
const update_business_verification_dto_1 = require("./dto/update-business-verification.dto");
let AdminController = class AdminController {
    adminService;
    validationPipe;
    constructor(adminService, validationPipe) {
        this.adminService = adminService;
        this.validationPipe = validationPipe;
    }
    getDashboardStats() {
        return this.adminService.getDashboardStats();
    }
    getFeaturedProducts() {
        return this.adminService.getFeaturedProducts();
    }
    async createBanner(req) {
        const { rawDto, files } = await this.parseBannerMultipartData(req);
        const createBannerDto = await this.validationPipe.transform(rawDto, {
            type: 'body',
            metatype: create_banner_dto_1.CreateBannerDto,
        });
        return this.adminService.createBanner(createBannerDto, files);
    }
    async parseBannerMultipartData(req) {
        if (!req.isMultipart()) {
            throw new common_1.BadRequestException('Request is not multipart/form-data.');
        }
        const rawDto = {};
        const files = {};
        for await (const part of req.parts()) {
            if (part.file) {
                const buffer = await part.toBuffer();
                if (part.fieldname === 'bannerImage') {
                    files.bannerImage = { buffer, filename: part.filename, mimetype: part.mimetype };
                }
                else if (part.fieldname === 'brandLogo') {
                    files.brandLogo = { buffer, filename: part.filename, mimetype: part.mimetype };
                }
            }
            else if (part.value) {
                rawDto[part.fieldname] = part.value;
            }
        }
        return { rawDto, files };
    }
    deleteBanner(id) {
        return this.adminService.deleteBanner(id);
    }
    getAllBusinesses() {
        return this.adminService.getAllBusinesses();
    }
    updateBusinessVerification(businessId, updateDto) {
        return this.adminService.updateBusinessVerification(businessId, updateDto);
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('dashboard-stats'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get dashboard statistics for the admin panel' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns aggregate counts of key entities.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden. User is not an admin.' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getDashboardStats", null);
__decorate([
    (0, common_1.Get)('featured-products'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all featured products grouped by category with business owner details' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns featured products organized by category with business owner company names.',
        schema: {
            type: 'object',
            properties: {
                categories: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            categoryId: { type: 'number' },
                            categoryName: { type: 'string' },
                            categorySlug: { type: 'string' },
                            products: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string' },
                                        title: { type: 'string' },
                                        description: { type: 'string' },
                                        slug: { type: 'string' },
                                        images: { type: 'array', items: { type: 'string' } },
                                        isPublished: { type: 'boolean' },
                                        createdAt: { type: 'string' },
                                        updatedAt: { type: 'string' },
                                        business: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'string' },
                                                name: { type: 'string' },
                                                city: { type: 'string' },
                                                state: { type: 'string' },
                                                isVerified: { type: 'boolean' },
                                                owner: {
                                                    type: 'object',
                                                    properties: {
                                                        name: { type: 'string' },
                                                        email: { type: 'string' }
                                                    }
                                                }
                                            }
                                        },
                                        variantCount: { type: 'number' },
                                        defaultVariant: {
                                            type: 'object',
                                            properties: {
                                                price: { type: 'number' },
                                                stock: { type: 'number' },
                                                status: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                totalFeaturedProducts: { type: 'number' }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden. User is not an admin.' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getFeaturedProducts", null);
__decorate([
    (0, common_1.Post)('banners'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new promotional banner' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['title', 'targetUrl', 'bannerImage'],
            properties: {
                title: { type: 'string' },
                discountText: { type: 'string' },
                targetUrl: { type: 'string', format: 'uri-relative' },
                position: { type: 'integer', default: 0 },
                bannerImage: { type: 'string', format: 'binary' },
                brandLogo: { type: 'string', format: 'binary' },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Banner created successfully.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad Request. Missing required fields or invalid data.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden. User is not an admin.' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createBanner", null);
__decorate([
    (0, common_1.Delete)('banners/:id'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a promotional banner by its ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Banner deleted successfully.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden. User is not an admin.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Not Found. Banner with the specified ID does not exist.' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteBanner", null);
__decorate([
    (0, common_1.Get)('businesses'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get a list of all businesses registered on the platform' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns an array of all businesses with owner details.',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    city: { type: 'string' },
                    state: { type: 'string' },
                    phone: { type: 'string' },
                    category: { type: 'string' },
                    isVerified: { type: 'boolean' },
                    createdAt: { type: 'string', format: 'date-time' },
                    owner: {
                        type: 'object',
                        properties: {
                            email: { type: 'string' },
                            name: { type: 'string' },
                        },
                    },
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden. User is not an admin.' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getAllBusinesses", null);
__decorate([
    (0, common_1.Patch)('businesses/:businessId/verify'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update the verification status of a business' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Business status updated successfully.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad Request. isVerified must be a boolean.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden. User is not an admin.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Business not found.' }),
    __param(0, (0, common_1.Param)('businessId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_business_verification_dto_1.UpdateBusinessVerificationDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateBusinessVerification", null);
exports.AdminController = AdminController = __decorate([
    (0, swagger_1.ApiTags)('Admin'),
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [admin_service_1.AdminService,
        common_1.ValidationPipe])
], AdminController);
//# sourceMappingURL=admin.controller.js.map