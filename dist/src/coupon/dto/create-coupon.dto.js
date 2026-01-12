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
exports.CreateCouponDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class CreateCouponDto {
    code;
    discountId;
    active;
    maxUses;
    perUserLimit;
    startsAt;
    expiresAt;
}
exports.CreateCouponDto = CreateCouponDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The unique code for the coupon (e.g., WELCOME10)', example: 'SUMMER25' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_transformer_1.Transform)(({ value }) => value.toUpperCase()),
    __metadata("design:type", String)
], CreateCouponDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The ID of the discount rules this coupon is linked to' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateCouponDto.prototype, "discountId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Is the coupon currently active?', default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateCouponDto.prototype, "active", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'The maximum number of times this coupon can be used in total' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateCouponDto.prototype, "maxUses", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'The maximum number of times a single user can use this coupon' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateCouponDto.prototype, "perUserLimit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'The date and time when the coupon becomes valid (ISO 8601 format)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDate)(),
    (0, class_transformer_1.Transform)(({ value }) => value && new Date(value)),
    __metadata("design:type", Date)
], CreateCouponDto.prototype, "startsAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'The date and time when the coupon expires (ISO 8601 format)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDate)(),
    (0, class_transformer_1.Transform)(({ value }) => value && new Date(value)),
    __metadata("design:type", Date)
], CreateCouponDto.prototype, "expiresAt", void 0);
//# sourceMappingURL=create-coupon.dto.js.map