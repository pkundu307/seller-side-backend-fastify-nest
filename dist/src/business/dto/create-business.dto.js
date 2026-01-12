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
exports.CreateBusinessDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateBusinessDto {
    name;
    gstNumber;
    address;
    city;
    state;
    country;
    postalCode;
    phone;
}
exports.CreateBusinessDto = CreateBusinessDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Name of the business' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBusinessDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'GST number of the business' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBusinessDto.prototype, "gstNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Street address of the business' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBusinessDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'City where the business is located' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBusinessDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'State where the business is located' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBusinessDto.prototype, "state", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Country where the business is located' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBusinessDto.prototype, "country", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Postal code for the business address' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBusinessDto.prototype, "postalCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Contact phone number for the business' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBusinessDto.prototype, "phone", void 0);
//# sourceMappingURL=create-business.dto.js.map