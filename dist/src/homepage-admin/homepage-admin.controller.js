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
exports.HomepageAdminController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const roles_decorator_1 = require("../auth/roles.decorator");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const homepage_admin_service_1 = require("./homepage-admin.service");
const create_homepage_section_dto_1 = require("./dto/create-homepage-section.dto");
const update_homepage_section_dto_1 = require("./dto/update-homepage-section.dto");
const update_status_dto_1 = require("./dto/update-status.dto");
const reorder_dto_1 = require("./dto/reorder.dto");
let HomepageAdminController = class HomepageAdminController {
    homepageAdminService;
    constructor(homepageAdminService) {
        this.homepageAdminService = homepageAdminService;
    }
    findAllSections() {
        return this.homepageAdminService.findAllSections();
    }
    createSection(dto) {
        return this.homepageAdminService.createSection(dto);
    }
    updateSection(id, dto) {
        return this.homepageAdminService.updateSection(id, dto);
    }
    updateSectionStatus(id, dto) {
        return this.homepageAdminService.updateSectionStatus(id, dto);
    }
    deleteSection(id) {
        return this.homepageAdminService.deleteSection(id);
    }
    async addItemToSection(sectionId, req) {
        const { dto, file } = await this.parseItemMultipart(req);
        return this.homepageAdminService.addItemToSection(sectionId, dto, file);
    }
    async updateItem(id, req) {
        const { dto, file } = await this.parseItemMultipart(req);
        return this.homepageAdminService.updateItem(id, dto, file);
    }
    updateItemStatus(id, dto) {
        return this.homepageAdminService.updateItemStatus(id, dto);
    }
    deleteItem(id) {
        return this.homepageAdminService.deleteItem(id);
    }
    async parseItemMultipart(req) {
        if (!req.isMultipart())
            throw new common_1.BadRequestException('Request must be multipart/form-data.');
        const dto = {};
        let file;
        for await (const part of req.parts()) {
            if (part.file) {
                if (part.fieldname === 'image') {
                    file = { buffer: await part.toBuffer(), filename: part.filename, mimetype: part.mimetype };
                }
            }
            else {
                dto[part.fieldname] = part.value;
            }
        }
        return { dto, file };
    }
    reorderSections(dto) {
        return this.homepageAdminService.reorderSections(dto);
    }
    reorderItems(dto) {
        return this.homepageAdminService.reorderItems(dto);
    }
};
exports.HomepageAdminController = HomepageAdminController;
__decorate([
    (0, common_1.Get)('sections'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all homepage sections and their items' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HomepageAdminController.prototype, "findAllSections", null);
__decorate([
    (0, common_1.Post)('sections'),
    (0, swagger_1.ApiOperation)({ summary: '1. Create a new homepage section' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_homepage_section_dto_1.CreateHomepageSectionDto]),
    __metadata("design:returntype", void 0)
], HomepageAdminController.prototype, "createSection", null);
__decorate([
    (0, common_1.Patch)('sections/:id'),
    (0, swagger_1.ApiOperation)({ summary: '3. Edit a homepage section\'s properties' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_homepage_section_dto_1.UpdateHomepageSectionDto]),
    __metadata("design:returntype", void 0)
], HomepageAdminController.prototype, "updateSection", null);
__decorate([
    (0, common_1.Patch)('sections/:id/status'),
    (0, swagger_1.ApiOperation)({ summary: '7. Toggle a section\'s active status' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_status_dto_1.UpdateStatusDto]),
    __metadata("design:returntype", void 0)
], HomepageAdminController.prototype, "updateSectionStatus", null);
__decorate([
    (0, common_1.Delete)('sections/:id'),
    (0, swagger_1.ApiOperation)({ summary: '5. Delete a section and all its items' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], HomepageAdminController.prototype, "deleteSection", null);
__decorate([
    (0, common_1.Post)('sections/:sectionId/items'),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({ summary: '2. Add a new item to a section' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                subtitle: { type: 'string' },
                linkType: { type: 'string' },
                linkValue: { type: 'string' },
                styleConfig: { type: 'string', description: 'JSON string' },
                image: { type: 'string', format: 'binary' }
            }
        }
    }),
    __param(0, (0, common_1.Param)('sectionId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], HomepageAdminController.prototype, "addItemToSection", null);
__decorate([
    (0, common_1.Patch)('items/:id'),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({ summary: '3. Edit an item (and optionally replace its image)' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                subtitle: { type: 'string' },
                linkType: { type: 'string' },
                linkValue: { type: 'string' },
                styleConfig: { type: 'string', description: 'JSON string' },
                image: { type: 'string', format: 'binary' }
            }
        }
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], HomepageAdminController.prototype, "updateItem", null);
__decorate([
    (0, common_1.Patch)('items/:id/status'),
    (0, swagger_1.ApiOperation)({ summary: '6. Toggle an item\'s active status' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_status_dto_1.UpdateStatusDto]),
    __metadata("design:returntype", void 0)
], HomepageAdminController.prototype, "updateItemStatus", null);
__decorate([
    (0, common_1.Delete)('items/:id'),
    (0, swagger_1.ApiOperation)({ summary: '4. Delete a single item from a section' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], HomepageAdminController.prototype, "deleteItem", null);
__decorate([
    (0, common_1.Patch)('sections/reorder'),
    (0, swagger_1.ApiOperation)({ summary: 'Reorder all homepage sections' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reorder_dto_1.ReorderDto]),
    __metadata("design:returntype", void 0)
], HomepageAdminController.prototype, "reorderSections", null);
__decorate([
    (0, common_1.Patch)('items/reorder'),
    (0, swagger_1.ApiOperation)({ summary: 'Reorder all items within a section' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reorder_dto_1.ReorderDto]),
    __metadata("design:returntype", void 0)
], HomepageAdminController.prototype, "reorderItems", null);
exports.HomepageAdminController = HomepageAdminController = __decorate([
    (0, swagger_1.ApiTags)('Admin - Homepage Management'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('admin/homepage'),
    __metadata("design:paramtypes", [homepage_admin_service_1.HomepageAdminService])
], HomepageAdminController);
//# sourceMappingURL=homepage-admin.controller.js.map