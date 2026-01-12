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
exports.HomepageService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const NodeCache = require("node-cache");
let HomepageService = class HomepageService {
    prisma;
    cache = new NodeCache({ stdTTL: 300 });
    CACHE_KEY = 'HOMEPAGE_LAYOUT';
    constructor(prisma) {
        this.prisma = prisma;
    }
    async onModuleInit() {
        console.log('Warming up homepage cache...');
    }
    async getHomepage() {
        const cachedData = this.cache.get(this.CACHE_KEY);
        if (cachedData) {
            console.log('Serving homepage from cache.');
            return cachedData;
        }
        console.log('Cache miss. Building homepage layout from database.');
        const freshData = await this.buildHomepageLayout();
        this.cache.set(this.CACHE_KEY, freshData);
        return freshData;
    }
    async buildHomepageLayout() {
        return this.prisma.homepageSection.findMany({
            where: {
                isActive: true,
                AND: [
                    {
                        OR: [
                            { startDate: null },
                            { startDate: { lte: new Date() } },
                        ],
                    },
                    {
                        OR: [
                            { endDate: null },
                            { endDate: { gte: new Date() } },
                        ],
                    },
                ],
            },
            orderBy: {
                position: 'asc',
            },
            select: {
                id: true,
                title: true,
                subtitle: true,
                type: true,
                styleConfig: true,
                items: {
                    where: {
                        isActive: true,
                    },
                    orderBy: {
                        position: 'asc',
                    },
                    select: {
                        id: true,
                        title: true,
                        subtitle: true,
                        imageUrl: true,
                        videoUrl: true,
                        linkType: true,
                        linkValue: true,
                        styleConfig: true,
                    },
                },
            },
        });
    }
    invalidateCache() {
        console.log('Homepage cache invalidated by admin action.');
        this.cache.del(this.CACHE_KEY);
        this.getHomepage();
    }
};
exports.HomepageService = HomepageService;
exports.HomepageService = HomepageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], HomepageService);
//# sourceMappingURL=homepage.service.js.map