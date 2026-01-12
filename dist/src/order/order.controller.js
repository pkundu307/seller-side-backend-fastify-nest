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
exports.OrdersController = void 0;
const common_1 = require("@nestjs/common");
const order_service_1 = require("./order.service");
const create_order_dto_1 = require("./dto/create-order.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const swagger_1 = require("@nestjs/swagger");
const cancel_order_dto_1 = require("./dto/cancel-order.dto");
let OrdersController = class OrdersController {
    ordersService;
    constructor(ordersService) {
        this.ordersService = ordersService;
    }
    async placeCashOnDeliveryOrder(req, dto) {
        return this.ordersService.createCashOnDeliveryOrder(req.user.id, dto);
    }
    async getOrderSuccess(req, orderId) {
        if (!orderId)
            throw new common_1.BadRequestException('Order ID is required');
        return this.ordersService.getOrderSuccessDetails(req.user.id, orderId);
    }
    async getMyOrders(req) {
        const customerUserId = req.user.id;
        return this.ordersService.findAllByCustomer(customerUserId);
    }
    async getSingleOrder(req, id) {
        return this.ordersService.findOneByCustomer(req.user.id, id);
    }
    async cancelMyOrder(req, orderId, cancelOrderDto) {
        const customerUserId = req.user.id;
        return this.ordersService.cancelOrder(customerUserId, orderId, cancelOrderDto);
    }
};
exports.OrdersController = OrdersController;
__decorate([
    (0, common_1.Post)('place-order/cod'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Place a new Cash on Delivery order' }),
    (0, swagger_1.ApiBody)({ type: create_order_dto_1.CreateOrderDto }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_order_dto_1.CreateOrderDto]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "placeCashOnDeliveryOrder", null);
__decorate([
    (0, common_1.Get)('success'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get order details for success page' }),
    (0, swagger_1.ApiQuery)({ name: 'orderId', required: true, type: String }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getOrderSuccess", null);
__decorate([
    (0, common_1.Get)('my-orders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all orders for the logged-in user' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of user orders.' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getMyOrders", null);
__decorate([
    (0, common_1.Get)('my-orders/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get details of a specific order' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getSingleOrder", null);
__decorate([
    (0, common_1.Post)(':orderId/cancel'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel an order (Customer)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Order cancelled successfully.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Order cannot be cancelled at its current stage.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'User does not have permission to cancel this order.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Order not found.' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('orderId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cancel_order_dto_1.CancelOrderDto]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "cancelMyOrder", null);
exports.OrdersController = OrdersController = __decorate([
    (0, swagger_1.ApiTags)('Orders'),
    (0, common_1.Controller)('orders'),
    __metadata("design:paramtypes", [order_service_1.OrdersService])
], OrdersController);
//# sourceMappingURL=order.controller.js.map