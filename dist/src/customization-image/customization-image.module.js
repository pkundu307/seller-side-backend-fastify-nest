"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomizationImageModule = void 0;
const common_1 = require("@nestjs/common");
const predefined_assets_service_1 = require("./predefined-assets.service");
const customization_image_controller_1 = require("./customization-image.controller");
const prisma_module_1 = require("../prisma/prisma.module");
const s3Service_1 = require("../products/utils/s3Service");
const generic_image_service_1 = require("./generic-image.service");
const generic_image_controller_1 = require("./generic-image.controller");
const customization_image_for_user_controller_1 = require("./customization-image-for-user.controller");
let CustomizationImageModule = class CustomizationImageModule {
};
exports.CustomizationImageModule = CustomizationImageModule;
exports.CustomizationImageModule = CustomizationImageModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [customization_image_controller_1.PredefinedAssetsController, generic_image_controller_1.GenericImageController, customization_image_for_user_controller_1.UserPredefinedAssetsController],
        providers: [
            predefined_assets_service_1.PredefinedAssetsService,
            generic_image_service_1.GenericImageService,
            s3Service_1.S3Service,
            common_1.ValidationPipe,
        ],
    })
], CustomizationImageModule);
//# sourceMappingURL=customization-image.module.js.map