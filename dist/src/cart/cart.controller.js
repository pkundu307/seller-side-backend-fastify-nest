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
exports.CartController = void 0;
const common_1 = require("@nestjs/common");
const cart_service_1 = require("./cart.service");
const add_to_cart_dto_1 = require("./dto/add-to-cart.dto");
const update_cart_item_dto_1 = require("./dto/update-cart-item.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
let CartController = class CartController {
    cartService;
    constructor(cartService) {
        this.cartService = cartService;
    }
    async testMultipart(req) {
        console.log(req.body);
        return { message: 'Parsed!', bodyKeys: Object.keys(req) };
    }
    async addItemToCart(req) {
        if (!req.isMultipart())
            throw new common_1.BadRequestException('Request must be multipart/form-data.');
        const customerUserId = req.user.id;
        const { fields, files } = await this.parseMultipartData(req);
        const dto = (0, class_transformer_1.plainToInstance)(add_to_cart_dto_1.AddToCartDto, {
            ...fields,
            quantity: fields.quantity ? parseInt(fields.quantity, 10) : 1,
        });
        const errors = await (0, class_validator_1.validate)(dto);
        if (errors.length > 0)
            throw new common_1.BadRequestException(errors);
        return this.cartService.addItem(customerUserId, dto, files);
    }
    async getCart(req) {
        return this.cartService.getCartItems(req.user.id);
    }
    async updateCartItem(cartItemId, dto, req) {
        return this.cartService.updateCartItem(req.user.id, cartItemId, dto);
    }
    async parseMultipartData(req) {
        const fields = {};
        const files = [];
        for await (const part of req.parts()) {
            if ('file' in part && part.fieldname === 'customizationImages') {
                const buffer = await part.toBuffer();
                files.push({ buffer, filename: part.filename, mimetype: part.mimetype });
            }
            else if ('value' in part) {
                fields[part.fieldname] = part.value;
            }
        }
        return { fields, files };
    }
    async deleteCartItem(cartItemId, req) {
        return this.cartService.deleteCartItem(req.user.id, cartItemId);
    }
};
exports.CartController = CartController;
__decorate([
    (0, common_1.Post)('test-multipart'),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CartController.prototype, "testMultipart", null);
__decorate([
    (0, common_1.Post)('add-item'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({ summary: 'Add an item to the cart (with optional customization)' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                productId: { type: 'string', format: 'uuid' },
                variantId: { type: 'string', format: 'uuid' },
                quantity: { type: 'number', default: 1 },
                customizationDetails: {
                    type: 'string',
                    example: '{"instructions":"Add logo to front"}',
                },
                customizationImages: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                },
            },
            required: ['productId', 'quantity'],
        },
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CartController.prototype, "addItemToCart", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all cart items for logged-in user' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CartController.prototype, "getCart", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update cart item (quantity/details/images)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_cart_item_dto_1.UpdateCartItemDto, Object]),
    __metadata("design:returntype", Promise)
], CartController.prototype, "updateCartItem", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Delete an item from the cart' }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CartController.prototype, "deleteCartItem", null);
exports.CartController = CartController = __decorate([
    (0, swagger_1.ApiTags)('Cart'),
    (0, common_1.Controller)('cart'),
    __metadata("design:paramtypes", [cart_service_1.CartService])
], CartController);
//# sourceMappingURL=cart.controller.js.map