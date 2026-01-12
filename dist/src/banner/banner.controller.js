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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BannersController = void 0;
const common_1 = require("@nestjs/common");
const banner_service_1 = require("./banner.service");
const swagger_1 = require("@nestjs/swagger");
let BannersController = class BannersController {
    bannersService;
    constructor(bannersService) {
        this.bannersService = bannersService;
    }
    findAllActiveBanners() {
        return this.bannersService.findAllActive();
    }
};
exports.BannersController = BannersController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all active promotional banners' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns an array of active promotional banners, ordered by position.',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BannersController.prototype, "findAllActiveBanners", null);
exports.BannersController = BannersController = __decorate([
    (0, swagger_1.ApiTags)('Banners (Public)'),
    (0, common_1.Controller)('banners'),
    __metadata("design:paramtypes", [banner_service_1.BannersService])
], BannersController);
//# sourceMappingURL=banner.controller.js.map