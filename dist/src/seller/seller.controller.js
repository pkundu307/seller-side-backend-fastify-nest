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
exports.SellerController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const seller_service_1 = require("./seller.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const seller_pagination_dto_1 = require("./dto/seller-pagination.dto");
const prisma_service_1 = require("../prisma/prisma.service");
const update_order_dtp_1 = require("./dto/update-order.dtp");
const create_pos_sale_dto_1 = require("./dto/create-pos-sale.dto");
const sale_pagination_dto_1 = require("./dto/sale-pagination.dto");
let SellerController = class SellerController {
    sellerService;
    prisma;
    constructor(sellerService, prisma) {
        this.sellerService = sellerService;
        this.prisma = prisma;
    }
    async verifyBusinessOwnership(userId, businessId) {
        const business = await this.prisma.business.findUnique({
            where: { id: businessId },
            select: { ownerId: true },
        });
        if (!business) {
            throw new common_1.NotFoundException(`Business with ID "${businessId}" not found.`);
        }
        if (business.ownerId !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to access this business.');
        }
    }
    async getBusinessOrders(req, businessId, query) {
        await this.verifyBusinessOwnership(req.user.id, businessId);
        return this.sellerService.getBusinessOrders(businessId, query);
    }
    async getBusinessOrderById(req, businessId, orderId) {
        await this.verifyBusinessOwnership(req.user.id, businessId);
        return this.sellerService.getBusinessOrderById(businessId, orderId);
    }
    async updateOrderStatus(req, businessId, orderId, updateDto) {
        await this.verifyBusinessOwnership(req.user.id, businessId);
        return this.sellerService.updateOrderStatus(businessId, orderId, updateDto);
    }
    async getShippingLabel(req, businessId, orderId, design, reply) {
        await this.verifyBusinessOwnership(req.user.id, businessId);
        const pdfBuffer = await this.sellerService.generateShippingLabelPdf(businessId, orderId);
        reply.header('Content-Type', 'application/pdf');
        reply.header('Content-Disposition', `attachment; filename=shipping-label-${orderId}.pdf`);
        reply.send(pdfBuffer);
    }
    async createPosSale(req, businessId, dto) {
        await this.verifyBusinessOwnership(req.user.id, businessId);
        return this.sellerService.createPosSale(businessId, dto);
    }
    async getBusinessSales(req, businessId, query) {
        await this.verifyBusinessOwnership(req.user.id, businessId);
        return this.sellerService.getBusinessSales(businessId, query);
    }
    async getBusinessSaleById(req, businessId, saleId) {
        await this.verifyBusinessOwnership(req.user.id, businessId);
        return this.sellerService.getBusinessSaleById(businessId, saleId);
    }
};
exports.SellerController = SellerController;
__decorate([
    (0, common_1.Get)(':businessId/orders'),
    (0, swagger_1.ApiOperation)({ summary: "Get all orders for one of the seller's businesses" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns a paginated list of orders and statistics.' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('businessId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, seller_pagination_dto_1.SellerPaginationDto]),
    __metadata("design:returntype", Promise)
], SellerController.prototype, "getBusinessOrders", null);
__decorate([
    (0, common_1.Get)(':businessId/orders/:orderId'),
    (0, swagger_1.ApiOperation)({ summary: "Get a specific order for one of the seller's businesses" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns detailed information for a single order.' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('businessId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('orderId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], SellerController.prototype, "getBusinessOrderById", null);
__decorate([
    (0, common_1.Patch)(':businessId/orders/:orderId'),
    (0, swagger_1.ApiOperation)({ summary: "Update the status and tracking info of an order" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Order updated successfully.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad Request (e.g., invalid status transition).' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Order or Business not found.' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('businessId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('orderId', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, update_order_dtp_1.UpdateSellerOrderDto]),
    __metadata("design:returntype", Promise)
], SellerController.prototype, "updateOrderStatus", null);
__decorate([
    (0, common_1.Get)(':businessId/orders/:orderId/shipping-label'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate and download a PDF shipping label for an order' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns the generated PDF file.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid design specified or missing address.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden.' }),
    (0, swagger_1.ApiQuery)({
        name: 'design',
        required: false,
        enum: ['a6', 'pos'],
        description: "The desired label format. Defaults to 'a6' if not provided.",
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('businessId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('orderId', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Query)('design')),
    __param(4, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], SellerController.prototype, "getShippingLabel", null);
__decorate([
    (0, common_1.Post)(':businessId/sales'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new Point-of-Sale (POS) sale for a business' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('businessId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_pos_sale_dto_1.CreatePosSaleDto]),
    __metadata("design:returntype", Promise)
], SellerController.prototype, "createPosSale", null);
__decorate([
    (0, common_1.Get)(':businessId/sales'),
    (0, swagger_1.ApiOperation)({ summary: "Get all sales records for one of the seller's businesses" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns a paginated list of sales.' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('businessId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, sale_pagination_dto_1.SalePaginationDto]),
    __metadata("design:returntype", Promise)
], SellerController.prototype, "getBusinessSales", null);
__decorate([
    (0, common_1.Get)(':businessId/sales/:saleId'),
    (0, swagger_1.ApiOperation)({ summary: "Get a specific sale record for one of the seller's businesses" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns detailed information for a single sale.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Sale not found or does not belong to the seller.' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('businessId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('saleId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], SellerController.prototype, "getBusinessSaleById", null);
exports.SellerController = SellerController = __decorate([
    (0, swagger_1.ApiTags)('Seller Dashboard'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('seller'),
    __metadata("design:paramtypes", [seller_service_1.SellerService,
        prisma_service_1.PrismaService])
], SellerController);
//# sourceMappingURL=seller.controller.js.map