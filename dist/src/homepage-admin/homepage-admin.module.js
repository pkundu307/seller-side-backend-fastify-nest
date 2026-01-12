"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HomepageAdminModule = void 0;
const common_1 = require("@nestjs/common");
const homepage_admin_service_1 = require("./homepage-admin.service");
const homepage_admin_controller_1 = require("./homepage-admin.controller");
const s3Service_1 = require("../products/utils/s3Service");
const prisma_module_1 = require("../prisma/prisma.module");
const homepage_module_1 = require("../homepage/homepage.module");
let HomepageAdminModule = class HomepageAdminModule {
};
exports.HomepageAdminModule = HomepageAdminModule;
exports.HomepageAdminModule = HomepageAdminModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, homepage_module_1.HomepageModule],
        controllers: [homepage_admin_controller_1.HomepageAdminController],
        providers: [homepage_admin_service_1.HomepageAdminService, s3Service_1.S3Service],
    })
], HomepageAdminModule);
//# sourceMappingURL=homepage-admin.module.js.map