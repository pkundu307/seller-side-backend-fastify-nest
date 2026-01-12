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
exports.SeoController = void 0;
const common_1 = require("@nestjs/common");
const seo_service_1 = require("./seo.service");
const swagger_1 = require("@nestjs/swagger");
let SeoController = class SeoController {
    seoService;
    constructor(seoService) {
        this.seoService = seoService;
    }
    async getSitemap(reply) {
        const sitemap = await this.seoService.generateSitemap();
        reply.header('Content-Type', 'application/xml');
        reply.send(sitemap);
    }
    async getRobotsTxt(reply) {
        const robotsTxt = await this.seoService.generateRobotsTxt();
        reply.header('Content-Type', 'text/plain');
        reply.send(robotsTxt);
    }
    async getPageMeta(type, slug) {
        return this.seoService.getPageMeta(type, slug);
    }
};
exports.SeoController = SeoController;
__decorate([
    (0, common_1.Get)('sitemap.xml'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate the sitemap.xml for the website' }),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SeoController.prototype, "getSitemap", null);
__decorate([
    (0, common_1.Get)('robots.txt'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate the robots.txt for the website' }),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SeoController.prototype, "getRobotsTxt", null);
__decorate([
    (0, common_1.Get)('meta'),
    (0, swagger_1.ApiOperation)({ summary: 'Get SEO metadata for a specific page' }),
    (0, swagger_1.ApiQuery)({ name: 'type', required: true, enum: ['product', 'category', 'home', 'other'] }),
    (0, swagger_1.ApiQuery)({ name: 'slug', required: false, type: String }),
    __param(0, (0, common_1.Query)('type')),
    __param(1, (0, common_1.Query)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SeoController.prototype, "getPageMeta", null);
exports.SeoController = SeoController = __decorate([
    (0, swagger_1.ApiTags)('SEO'),
    (0, common_1.Controller)('seo'),
    __metadata("design:paramtypes", [seo_service_1.SeoService])
], SeoController);
//# sourceMappingURL=seo.controller.js.map