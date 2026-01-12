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
exports.CreateHomepageItemDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
class CreateHomepageItemDto {
    title;
    subtitle;
    linkType;
    linkValue;
    styleConfig;
    position;
}
exports.CreateHomepageItemDto = CreateHomepageItemDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateHomepageItemDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateHomepageItemDto.prototype, "subtitle", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.LinkType, default: client_1.LinkType.NONE }),
    (0, class_validator_1.IsEnum)(['NONE', 'CATEGORY', 'PRODUCT', 'BRAND', 'SEARCH', 'EXTERNAL_URL']),
    __metadata("design:type", String)
], CreateHomepageItemDto.prototype, "linkType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'A URL, slug, or ID depending on linkType' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateHomepageItemDto.prototype, "linkValue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'JSON string for custom styling' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsJSON)(),
    __metadata("design:type", String)
], CreateHomepageItemDto.prototype, "styleConfig", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Order of item within the section', default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateHomepageItemDto.prototype, "position", void 0);
//# sourceMappingURL=create-homepage-item.dto.js.map