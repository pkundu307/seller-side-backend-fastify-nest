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
exports.WishlistController = void 0;
const common_1 = require("@nestjs/common");
const wishlist_service_1 = require("./wishlist.service");
const add_to_wishlist_dto_1 = require("./dto/add-to-wishlist.dto");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let WishlistController = class WishlistController {
    wishlistService;
    constructor(wishlistService) {
        this.wishlistService = wishlistService;
    }
    addToWishlist(req, addToWishlistDto) {
        const customerUserId = req.user.id;
        return this.wishlistService.addToWishlist(customerUserId, addToWishlistDto);
    }
    getWishlist(req) {
        const customerUserId = req.user.id;
        return this.wishlistService.getWishlist(customerUserId);
    }
    removeFromWishlist(req, wishlistItemId) {
        const customerUserId = req.user.id;
        return this.wishlistService.removeFromWishlist(customerUserId, wishlistItemId);
    }
};
exports.WishlistController = WishlistController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Add a product to the user\'s wishlist' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Product added successfully.' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Product is already in the wishlist.' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, add_to_wishlist_dto_1.AddToWishlistDto]),
    __metadata("design:returntype", void 0)
], WishlistController.prototype, "addToWishlist", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all products in the user\'s wishlist' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns a list of wishlist items.' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WishlistController.prototype, "getWishlist", null);
__decorate([
    (0, common_1.Delete)(':wishlistItemId'),
    (0, swagger_1.ApiOperation)({ summary: 'Remove a product from the user\'s wishlist' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Product removed successfully.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Wishlist item not found or does not belong to the user.' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('wishlistItemId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], WishlistController.prototype, "removeFromWishlist", null);
exports.WishlistController = WishlistController = __decorate([
    (0, swagger_1.ApiTags)('Wishlist'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('wishlist'),
    __metadata("design:paramtypes", [wishlist_service_1.WishlistService])
], WishlistController);
//# sourceMappingURL=wishlist.controller.js.map