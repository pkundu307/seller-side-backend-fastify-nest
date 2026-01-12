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
exports.CreateHomepageSectionDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const create_homepage_item_dto_1 = require("./create-homepage-item.dto");
class CreateHomepageSectionDto {
    title;
    type;
    styleConfig;
    items;
}
exports.CreateHomepageSectionDto = CreateHomepageSectionDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateHomepageSectionDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.SectionType }),
    (0, class_validator_1.IsEnum)(['HERO_SLIDER', 'SCROLLABLE_ROW', 'GRID_2XN', 'GRID_3XN', 'GRID_SQUARE_COMPACT', 'SINGLE_BANNER', 'PRODUCT_CAROUSEL']),
    __metadata("design:type", String)
], CreateHomepageSectionDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'JSON string for custom styling' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsJSON)(),
    __metadata("design:type", String)
], CreateHomepageSectionDto.prototype, "styleConfig", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: () => [create_homepage_item_dto_1.CreateHomepageItemDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => create_homepage_item_dto_1.CreateHomepageItemDto),
    __metadata("design:type", Array)
], CreateHomepageSectionDto.prototype, "items", void 0);
//# sourceMappingURL=create-homepage-section.dto.js.map