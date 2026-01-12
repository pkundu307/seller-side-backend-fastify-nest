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
exports.AttributesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AttributesService = class AttributesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAttributesForCategory(categoryId) {
        const attributes = await this.prisma.attribute.findMany({
            where: {
                categoryId: categoryId,
            },
            include: {
                options: {
                    orderBy: { position: 'asc' },
                },
            },
            orderBy: {
                position: 'asc',
            },
        });
        if (attributes.length === 0) {
            const categoryExists = await this.prisma.category.count({ where: { id: categoryId } });
            if (categoryExists === 0) {
                throw new common_1.NotFoundException(`Category with ID ${categoryId} not found.`);
            }
        }
        return attributes;
    }
};
exports.AttributesService = AttributesService;
exports.AttributesService = AttributesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AttributesService);
//# sourceMappingURL=attributes.service.js.map