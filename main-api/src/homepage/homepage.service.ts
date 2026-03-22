// src/homepage/homepage.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class HomepageService implements OnModuleInit {
  private readonly logger = new Logger(HomepageService.name);
  private readonly KEY_LAYOUT      = 'HOMEPAGE_LAYOUT';
  private readonly KEY_DISTRIBUTED = 'HOMEPAGE_DISTRIBUTED_PRODUCTS';
  private readonly TTL_24H         = 86400; // seconds
  private redis: Redis;

  constructor(
    private prisma:         PrismaService,
    private configService:  ConfigService,
  ) {
    this.redis = new Redis({
      host:   this.configService.get<string>('REDIS_HOST', '127.0.0.1'),
      port:   this.configService.get<number>('REDIS_PORT', 6379),
      family: 4, // force IPv4
    });

    this.redis.on('connect', () => this.logger.log('✅ Redis connected'));
    this.redis.on('error',   (err) => this.logger.error('❌ Redis error', err));
  }

  async onModuleInit() {
    this.logger.log('Warming up Redis cache for Homepage...');
    setTimeout(async () => {
      await this.getHomepage();
      await this.getHomepageDistributed();
    }, 1000);
  }

  // ── helpers ──────────────────────────────────────────────────────────────
  private async cacheGet<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  }

  private async cacheSet(key: string, value: unknown): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', this.TTL_24H);
  }

  // ── public methods ────────────────────────────────────────────────────────
  async getHomepage() {
    const cached = await this.cacheGet(this.KEY_LAYOUT);
    if (cached) return cached;

    const freshData = await this.buildHomepageLayout();
    await this.cacheSet(this.KEY_LAYOUT, freshData);
    return freshData;
  }

  async getHomepageDistributed() {
    const cached = await this.cacheGet(this.KEY_DISTRIBUTED);
    if (cached) return cached;

    this.logger.log('Cache Miss: Rebuilding Category-Distributed Products...');

    const categories = await this.prisma.category.findMany({
      where: {
        isActive: true,
        products: { some: { isPublished: true, deletedAt: null } },
      },
      select: { id: true, name: true, slug: true },
    });

    const distributedData = await Promise.all(
      categories.map(async (cat) => {
        const products = await this.prisma.product.findMany({
          where:   { categoryId: cat.id, isPublished: true, deletedAt: null },
          take:    10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, title: true, images: true,
            variants: {
              where:  { status: 'ACTIVE', deletedAt: null },
              take:   1,
              select: { price: true, sku: true },
            },
          },
        });

        return {
          categoryName: cat.name,
          categoryId:   cat.id,
          categorySlug: cat.slug,
          products: products.map((p) => ({
            id:    p.id,
            name:  p.title,
            image: p.images?.[0] || null,
            price: p.variants?.[0]?.price ? Number(p.variants[0].price) : 0,
            sku:   p.variants?.[0]?.sku   || 'N/A',
          })),
        };
      }),
    );

    const result = distributedData.filter((c) => c.products.length > 0);
    await this.cacheSet(this.KEY_DISTRIBUTED, result);
    this.logger.log('✅ Successfully saved distributed products to Redis');
    return result;
  }

  async buildHomepageLayout() {
    return this.prisma.homepageSection.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: new Date() } }] },
          { OR: [{ endDate:   null }, { endDate:   { gte: new Date() } }] },
        ],
      },
      orderBy: { position: 'asc' },
      select: {
        id: true, title: true, subtitle: true, type: true, styleConfig: true,
        items: {
          where:   { isActive: true },
          orderBy: { position: 'asc' },
          select: {
            id: true, title: true, subtitle: true, imageUrl: true,
            videoUrl: true, linkType: true, linkValue: true, styleConfig: true,
          },
        },
      },
    });
  }

  async invalidateCache() {
    await this.redis.del(this.KEY_LAYOUT, this.KEY_DISTRIBUTED);
    this.logger.warn('Redis Cache Invalidated');
    return { success: true, message: 'Redis Cache Purged' };
  }
}