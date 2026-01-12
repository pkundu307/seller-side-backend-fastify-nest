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
exports.AttributesController = void 0;
const common_1 = require("@nestjs/common");
const attributes_service_1 = require("./attributes.service");
const swagger_1 = require("@nestjs/swagger");
let AttributesController = class AttributesController {
    attributesService;
    constructor(attributesService) {
        this.attributesService = attributesService;
    }
    async getOptionsForAttribute(attributeId) {
        return this.attributesService.getAttributesForCategory(attributeId);
    }
};
exports.AttributesController = AttributesController;
__decorate([
    (0, common_1.Get)(':attributeId/options'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all predefined options for a specific attribute' }),
    __param(0, (0, common_1.Param)('attributeId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], AttributesController.prototype, "getOptionsForAttribute", null);
exports.AttributesController = AttributesController = __decorate([
    (0, swagger_1.ApiTags)('Attributes'),
    (0, common_1.Controller)('attributes'),
    __metadata("design:paramtypes", [attributes_service_1.AttributesService])
], AttributesController);
//# sourceMappingURL=attributes.controller.js.map