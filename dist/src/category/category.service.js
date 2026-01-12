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
var CategoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryService = void 0;
exports.slugify = slugify;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const NodeCache = require("node-cache");
const common_2 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
function slugify(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
let CategoryService = CategoryService_1 = class CategoryService {
    prisma;
    logger = new common_2.Logger(CategoryService_1.name);
    cache = new NodeCache({ stdTTL: 0 });
    CACHE_KEY = 'all_categories_tree_v2';
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createCategory(createCategoryDto) {
        if (createCategoryDto.parentId) {
            const parentExists = await this.prisma.category.findUnique({
                where: { id: createCategoryDto.parentId },
            });
            if (!parentExists) {
                throw new common_1.NotFoundException(`Parent category with ID ${createCategoryDto.parentId} not found.`);
            }
        }
        try {
            const slug = this.generateSlug(createCategoryDto.name);
            return await this.prisma.category.create({
                data: {
                    name: createCategoryDto.name,
                    parentId: createCategoryDto.parentId,
                    slug: slug,
                },
            });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new common_1.ConflictException(`A category with this name might already exist.`);
            }
            throw error;
        }
    }
    async getTopLevelCategories() {
        return this.prisma.category.findMany({
            where: { parentId: null },
            orderBy: { name: 'asc' },
        });
    }
    async getChildrenByParentId(parentId) {
        return this.prisma.category.findMany({
            where: { parentId: parentId },
            orderBy: { name: 'asc' },
        });
    }
    async searchCategories(query) {
        if (!query || query.trim().length < 2)
            return [];
        const results = await this.prisma.$queryRaw `
  WITH RECURSIVE CategoryPath AS (
    -- Anchor member: Start with categories matching the search query
    SELECT
      id,
      name,
      "parentId",
      ARRAY[id] AS path_ids,
      --  <<<<<<<<<<<<<<<<<< THE FIX IS HERE >>>>>>>>>>>>>>>>>>
      ARRAY[name]::TEXT[] AS path_names
    FROM
      category
    WHERE
      name ILIKE ${'%' + query + '%'}

    UNION ALL

    -- Recursive member: Join with parent category
    SELECT
      c.id,
      c.name,
      c."parentId",
      c.id || cp.path_ids,
      c.name || cp.path_names
    FROM
      category c
    JOIN
      CategoryPath cp ON c.id = cp."parentId"
  )
  -- Select the final paths when we've reached the root (parentId is NULL)
  SELECT
    path_ids,
    path_names
  FROM
    CategoryPath
  WHERE
    "parentId" IS NULL;
`;
        return results.map((p) => ({
            ids: p.path_ids.reverse().map(String),
            names: p.path_names.reverse(),
            fullPath: p.path_names.reverse().join(' > '),
        }));
    }
    async addAttributesToCategoryBatch(dto) {
        const { categoryId, attributes } = dto;
        const category = await this.prisma.category.findUnique({
            where: { id: categoryId },
        });
        if (!category) {
            throw new common_1.NotFoundException(`Category with ID "${categoryId}" not found.`);
        }
        const childCount = await this.prisma.category.count({
            where: { parentId: category.id },
        });
        if (childCount > 0) {
            console.log(childCount);
            throw new common_1.BadRequestException('Attributes can only be added to child-most categories.');
        }
        try {
            const createdAttributes = await this.prisma.$transaction(attributes.map(attributeData => this.prisma.attribute.create({
                data: {
                    name: attributeData.name,
                    categoryId: category.id,
                    options: {
                        create: attributeData.options.map((opt, index) => ({
                            value: opt.value,
                            slug: slugify(opt.value),
                            position: index,
                        })),
                    },
                },
                include: {
                    options: true,
                },
            })));
            return createdAttributes;
        }
        catch (error) {
            if (error.code === 'P2002') {
                throw new common_1.BadRequestException('One or more attribute names or option values already exist for this category.');
            }
            throw error;
        }
    }
    generateSlug(name) {
        return name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    }
    async getAttributesByCategoryId(categoryId) {
        const category = await this.prisma.category.findUnique({
            where: {
                id: categoryId,
            },
            include: {
                attributes: {
                    orderBy: { position: 'asc' },
                    include: {
                        options: {
                            orderBy: { position: 'asc' },
                        },
                    },
                },
            },
        });
        if (!category) {
            throw new common_1.NotFoundException(`Category with ID "${categoryId}" not found`);
        }
        return category.attributes;
    }
    async getAllCategoriesAsTree() {
        const cacheKey = 'all_categories_tree_v2';
        const cachedTree = this.cache.get(this.CACHE_KEY);
        if (cachedTree) {
            return cachedTree;
        }
        this.logger.warn('⚠️ Cache miss. Building category tree synchronously.');
        return this.buildAndCacheTree();
    }
    async handleDailyCacheRefresh() {
        this.logger.log('🔄 Cron Job: Starting daily category tree refresh...');
        const start = Date.now();
        await this.buildAndCacheTree();
        this.logger.log(`✅ Cron Job: Cache refreshed in ${Date.now() - start}ms`);
    }
    async buildAndCacheTree() {
        const allCategories = await this.prisma.category.findMany({
            select: {
                id: true,
                name: true,
                parentId: true,
                slug: true,
            },
            orderBy: { name: 'asc' },
        });
        const categoryMap = new Map();
        const rootCategories = [];
        allCategories.forEach((category) => {
            categoryMap.set(category.id, {
                ...category,
                children: []
            });
        });
        allCategories.forEach((category) => {
            const currentNode = categoryMap.get(category.id);
            if (category.parentId) {
                const parentNode = categoryMap.get(category.parentId);
                if (parentNode) {
                    parentNode.children.push(currentNode);
                }
                else {
                    rootCategories.push(currentNode);
                }
            }
            else {
                rootCategories.push(currentNode);
            }
        });
        this.cache.set(this.CACHE_KEY, rootCategories);
        return rootCategories;
    }
};
exports.CategoryService = CategoryService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_4AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CategoryService.prototype, "handleDailyCacheRefresh", null);
exports.CategoryService = CategoryService = CategoryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CategoryService);
//# sourceMappingURL=category.service.js.map