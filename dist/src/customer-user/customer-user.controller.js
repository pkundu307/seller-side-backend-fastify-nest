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
exports.CustomerUserController = void 0;
const common_1 = require("@nestjs/common");
const customer_user_service_1 = require("./customer-user.service");
const create_address_dto_1 = require("./dto/create-address.dto");
const update_address_dto_1 = require("./dto/update-address.dto");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let CustomerUserController = class CustomerUserController {
    customerUserService;
    constructor(customerUserService) {
        this.customerUserService = customerUserService;
    }
    async getMyAddresses(req) {
        const userId = req.user.id;
        return this.customerUserService.findAddressesByUserId(userId);
    }
    async addAddress(req, createAddressDto) {
        const userId = req.user.id;
        return this.customerUserService.createAddress(userId, createAddressDto);
    }
    async updateAddress(req, addressId, updateAddressDto) {
        const userId = req.user.id;
        return this.customerUserService.updateAddress(userId, addressId, updateAddressDto);
    }
    async deleteAddress(req, addressId) {
        const userId = req.user.id;
        return this.customerUserService.deleteAddress(userId, addressId);
    }
};
exports.CustomerUserController = CustomerUserController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all addresses for the logged-in user' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CustomerUserController.prototype, "getMyAddresses", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Add a new address for the logged-in user' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_address_dto_1.CreateAddressDto]),
    __metadata("design:returntype", Promise)
], CustomerUserController.prototype, "addAddress", null);
__decorate([
    (0, common_1.Patch)(':addressId'),
    (0, swagger_1.ApiOperation)({ summary: 'Update an existing address by its ID' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('addressId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_address_dto_1.UpdateAddressDto]),
    __metadata("design:returntype", Promise)
], CustomerUserController.prototype, "updateAddress", null);
__decorate([
    (0, common_1.Delete)(':addressId'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete an address by its ID' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('addressId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CustomerUserController.prototype, "deleteAddress", null);
exports.CustomerUserController = CustomerUserController = __decorate([
    (0, swagger_1.ApiTags)('User Addresses'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('user/addresses'),
    __metadata("design:paramtypes", [customer_user_service_1.CustomerUserService])
], CustomerUserController);
//# sourceMappingURL=customer-user.controller.js.map