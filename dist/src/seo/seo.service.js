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
exports.SeoService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const config_1 = require("@nestjs/config");
let SeoService = class SeoService {
    prisma;
    configService;
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
    }
    getBaseUrl() {
        return this.configService.get('FRONTEND_URL') || 'https://jottosop.in';
    }
    async generateSitemap() {
        const baseUrl = this.getBaseUrl();
        const products = await this.prisma.product.findMany({
            where: { isPublished: true },
            select: { slug: true, updatedAt: true },
        });
        const categories = await this.prisma.category.findMany({
            select: { slug: true, updatedAt: true },
        });
        let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;
        categories.forEach((category) => {
            sitemap += `
  <url>
    <loc>${baseUrl}/category/${category.slug}</loc>
    <lastmod>${category.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
        });
        products.forEach((product) => {
            sitemap += `
  <url>
    <loc>${baseUrl}/products/${product.slug}</loc>
    <lastmod>${product.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
        });
        const staticPages = [
            { url: '/cookies', priority: '0.5' },
            { url: '/contact', priority: '0.5' },
            { url: '/terms', priority: '0.3' },
            { url: '/privacy', priority: '0.3' },
        ];
        staticPages.forEach((page) => {
            sitemap += `
  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
        });
        sitemap += '\n</urlset>';
        return sitemap;
    }
    async generateRobotsTxt() {
        const baseUrl = this.getBaseUrl();
        const disallowPaths = [
            '/api', '/admin', '/profile', '/cart', '/checkout',
            '/orders', '/wishlist', '/notifications',
        ];
        let robotsTxt = `User-agent: *\n`;
        disallowPaths.forEach(path => {
            robotsTxt += `Disallow: ${path}/\n`;
        });
        robotsTxt += `\nSitemap: ${baseUrl}/sitemap.xml`;
        return robotsTxt;
    }
    async getPageMeta(type, slug) {
        const baseUrl = this.getBaseUrl();
        switch (type) {
            case 'product':
                if (!slug)
                    throw new common_1.NotFoundException('Product slug is required.');
                const product = await this.prisma.product.findUnique({
                    where: { slug },
                    select: { title: true, metaDescription: true, images: true, tags: true, category: { select: { name: true } } },
                });
                if (!product)
                    throw new common_1.NotFoundException(`Product with slug "${slug}" not found.`);
                const description = (product.metaDescription || product.title).substring(0, 160);
                return {
                    title: `${product.title} | Jottosop`,
                    description,
                    keywords: [product.title, product.category.name, ...product.tags].join(', '),
                    ogTitle: product.title,
                    ogDescription: description,
                    ogImage: product.images[0] || `${baseUrl}/og-default.png`,
                    ogUrl: `${baseUrl}/product/${slug}`,
                    canonical: `${baseUrl}/product/${slug}`,
                };
            case 'category':
                if (!slug)
                    throw new common_1.NotFoundException('Category slug is required.');
                const category = await this.prisma.category.findUnique({
                    where: { slug },
                    select: { name: true }
                });
                if (!category)
                    throw new common_1.NotFoundException(`Category with slug "${slug}" not found.`);
                return {
                    title: `Shop ${category.name} Online | Jottosop`,
                    description: `Explore a wide range of ${category.name} at the best prices on Jottosop. Fast delivery and great deals.`,
                    keywords: `${category.name}, buy ${category.name}, ${category.name} online`,
                    ogTitle: `Shop for ${category.name}`,
                    ogDescription: `Discover our collection of ${category.name}.`,
                    ogImage: `${baseUrl}/og-default.png`,
                    ogUrl: `${baseUrl}/category/${slug}`,
                    canonical: `${baseUrl}/category/${slug}`,
                };
            case 'home':
            default:
                return {
                    title: 'Jottosop - Your One-Stop E-commerce Destination',
                    description: 'Shop for the latest in electronics, fashion, and more. Jottosop offers great deals and fast shipping.',
                    keywords: 'online shopping, e-commerce, deals, electronics, fashion',
                    ogTitle: 'Jottosop - Online Shopping Made Easy',
                    ogDescription: 'Discover amazing products and deals on Jottosop.',
                    ogImage: `${baseUrl}/og-home.png`,
                    ogUrl: baseUrl,
                    canonical: baseUrl,
                };
        }
    }
};
exports.SeoService = SeoService;
exports.SeoService = SeoService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], SeoService);
//# sourceMappingURL=seo.service.js.map