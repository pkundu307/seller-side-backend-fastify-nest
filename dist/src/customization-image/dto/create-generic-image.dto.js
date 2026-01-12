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
exports.AddGenericImagesDto = exports.ImageType = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var ImageType;
(function (ImageType) {
    ImageType["CATEGORY"] = "category";
    ImageType["SUBCATEGORY"] = "subcategory";
})(ImageType || (exports.ImageType = ImageType = {}));
class AddGenericImagesDto {
    categoryOrSubcategoryId;
    type;
    imageUrls;
}
exports.AddGenericImagesDto = AddGenericImagesDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The ID of the category or subcategory these images are for.',
        example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AddGenericImagesDto.prototype, "categoryOrSubcategoryId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The type of entity these images represent.',
        enum: ImageType,
        example: ImageType.CATEGORY,
    }),
    (0, class_validator_1.IsIn)([ImageType.CATEGORY, ImageType.SUBCATEGORY]),
    __metadata("design:type", String)
], AddGenericImagesDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'A JSON string array of image URLs to add directly. Provide this OR imageFiles.',
        example: '["https://example.com/image1.png", "https://example.com/image2.jpg"]',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsJSON)(),
    __metadata("design:type", String)
], AddGenericImagesDto.prototype, "imageUrls", void 0);
//# sourceMappingURL=create-generic-image.dto.js.map