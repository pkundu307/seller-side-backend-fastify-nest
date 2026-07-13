import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { restOfIndiaRate } from '../payment/utils/xpressbees-calculator';

@Injectable()
export class HomepageService implements OnModuleInit {
  private readonly logger = new Logger(HomepageService.name);
  private readonly KEY_LAYOUT = 'HOMEPAGE_LAYOUT';
  private readonly KEY_DISTRIBUTED = 'HOMEPAGE_DISTRIBUTED_PRODUCTS';
  private readonly TTL_24H = 86400;
  private redis: Redis | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const redisHost = this.configService.get<string>('REDIS_HOST');

    // Only initialize Redis if host is configured
    if (redisHost) {
      try {
        // ── Dynamic Redis Config (Supports VPS & Cloud/Upstash) ──
        const redisOptions: any = {
          host: redisHost,
          port: this.configService.get<number>('REDIS_PORT', 6379),
          family: 4,
          maxRetriesPerRequest: 1,  // Quick fail on connection error
        };

        const password = this.configService.get<string>('REDIS_PASSWORD');
        if (password) redisOptions.password = password;

        if (this.configService.get<string>('REDIS_TLS') === 'true') {
          redisOptions.tls = {};
        }

        this.redis = new Redis(redisOptions);

        this.redis.on('connect', () => this.logger.log('✅ Redis connected'));
        this.redis.on('error', (err) => this.logger.debug('Redis connection error (may be optional)', err.message));
      } catch (e) {
        this.logger.debug('Redis initialization failed, caching will be disabled');
      }
    }
  }

  async onModuleInit() {
    this.logger.log('Warming up Redis cache for Homepage...');
    setTimeout(async () => {
      try {
        await this.getHomepage();
        await this.getHomepageDistributed();
      } catch (e) {
        this.logger.error('Failed to warm up cache', e);
      }
    }, 1000);
  }

  private async cacheGet<T>(key: string): Promise<T | null> {
    // Skip cache if Redis is not available
    if (!this.redis) return null;

    try {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  private async cacheSet(key: string, value: unknown): Promise<void> {
    // Skip cache if Redis is not available
    if (!this.redis) return;

    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', this.TTL_24H);
    } catch (e) {
      this.logger.debug(`Redis set failed for ${key}`, e);
    }
  }

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
        products: { some: { isPublished: true, deletedAt: null, isFeatured: true } },
      },
      select: { id: true, name: true, slug: true },
    });

    const distributedData = await Promise.all(
      categories.map(async (cat) => {
        const products = await this.prisma.product.findMany({
          where: { categoryId: cat.id, isPublished: true, deletedAt: null, isFeatured: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            images: true,
            slug: true,
            variants: {
              where: { status: 'ACTIVE', deletedAt: null },
              take: 1,
              select: {
                price: true,
                mrp: true,
                weightInGrams: true,
                length: true,
                width: true,
                height: true,
              },
            },
          },
        });

        return {
          categoryName: cat.name,
          categoryId: cat.id,
          categorySlug: cat.slug,
          products: products.map((p) => {
            const v = p.variants?.[0];
            const basePrice = v?.price ? Number(v.price) : 0;
            const baseMrp = v?.mrp ? Number(v.mrp) : 0;

            if (basePrice > 399 && v) {
              const actualG = Number(v.weightInGrams ?? 500);
              const l = parseFloat(v.length?.toString() ?? '0');
              const w = parseFloat(v.width?.toString() ?? '0');
              const h = parseFloat(v.height?.toString() ?? '0');
              const volG = (l * w * h) / 5;
              const chargeableG = Math.ceil(Math.max(actualG, volG) / 500) * 500;
              const shippingCharge = restOfIndiaRate(chargeableG);

              return {
                id: p.id,
                name: p.title,
                image: p.images?.[0] ?? null,
                price: basePrice + shippingCharge,
                mrp: baseMrp + shippingCharge,
                slug: p.slug,
                shippingIncluded: true,
                shippingCharge,
                freeShippingEligible: true,
              };
            }

            return {
              id: p.id,
              name: p.title,
              image: p.images?.[0] ?? null,
              price: basePrice,
              mrp: baseMrp,
              slug: p.slug,
              shippingIncluded: false,
              shippingCharge: 0,
              freeShippingEligible: false,
            };
          }),
        };
      }),
    );

    const result = distributedData.filter((c) => c.products.length > 0);
    await this.cacheSet(this.KEY_DISTRIBUTED, result);
    return result;
  }

  async buildHomepageLayout() {
    return this.prisma.homepageSection.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: new Date() } }] },
          { OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
        ],
      },
      orderBy: { position: 'asc' },
      select: {
        id: true, title: true, subtitle: true, type: true, styleConfig: true,
        items: {
          where: { isActive: true },
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