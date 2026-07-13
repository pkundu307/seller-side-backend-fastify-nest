// src/category-layout/category-layout.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export type CategoryLayoutType =
  | 'HERO_BANNER'
  | 'SCROLLABLE_ROW'
  | 'GRID_2XN'
  | 'GRID_3XN'
  | 'GRID_SQUARE_COMPACT'
  | 'SINGLE_BANNER'
  | 'PRODUCT_CAROUSEL'
  | 'FEATURED_PRODUCTS'
  | 'BANNER_WITH_TEXT';

export interface CategoryLayoutItem {
  id: number;
  title: string | null;
  subtitle: string | null;
  imageUrl: string | null;
  isActive: boolean;
  position: number;
  linkType: string;
  linkValue: string | null;
  styleConfig: any;
  videoUrl: string | null;
}

export interface CategoryLayout {
  id: number;
  categorySlug: string;
  title: string | null;
  subtitle: string | null;
  isActive: boolean;
  position: number;
  styleConfig: any;
  type: CategoryLayoutType;
  items: CategoryLayoutItem[];
}

@Injectable()
export class CategoryLayoutService implements OnModuleInit {
  private readonly logger = new Logger(CategoryLayoutService.name);
  private redis: Redis | null = null;

  constructor(
    private prisma:         PrismaService,
    private configService:  ConfigService,
  ) {
    const redisHost = this.configService.get<string>('REDIS_HOST');
    const redisPort = this.configService.get<number>('REDIS_PORT');

    // Only initialize Redis if host is configured
    if (redisHost) {
      try {
        this.redis = new Redis({
          host:   redisHost,
          port:   redisPort || 6379,
          family: 4,
          maxRetriesPerRequest: 1,  // Quick fail on connection error
        });

        this.redis.on('connect', () => this.logger.log('✅ Redis connected'));
        this.redis.on('error',   (err) => this.logger.debug('Redis connection error (may be optional)', err.message));
      } catch (error) {
        this.logger.debug('Redis initialization failed, caching will be disabled', error.message);
      }
    }
  }

  async onModuleInit() {
    this.logger.log('CategoryLayout service initialized');
  }

  // ── helpers ──────────────────────────────────────────────────────────────
  private getCacheKey(categorySlug: string): string {
    return `CATEGORY_LAYOUT_${categorySlug}`;
  }

  private async cacheGet<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  }

  private async cacheSet(key: string, value: unknown): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', 86400); // 24 hours
  }

  // ── public methods ────────────────────────────────────────────────────────
  async getCategoryLayout(input: string | number, type?: CategoryLayoutType): Promise<CategoryLayout | null> {
    let categorySlug: string;

    // If input is a number (category ID), fetch the category to get slug
    if (typeof input === 'number' || /^\d+$/.test(String(input))) {
      const categoryId = typeof input === 'number' ? input : parseInt(String(input));
      const category = await this.prisma.category.findFirst({
        where: { id: categoryId, isActive: true },
        select: { slug: true },
      });

      if (!category) {
        return null;
      }
      categorySlug = category.slug;
    } else {
      categorySlug = String(input);
    }

    const cacheKey = type ? `CATEGORY_LAYOUT_${categorySlug}_${type}` : `CATEGORY_LAYOUT_${categorySlug}`;
    const cached = await this.cacheGet<CategoryLayout>(cacheKey);
    if (cached) {
      this.logger.log(`Cache hit for category layout: ${categorySlug} ${type ? `(${type})` : ''}`);
      return cached;
    }

    this.logger.log(`Cache miss for category layout: ${categorySlug} ${type ? `(${type})` : ''}`);
    const layout = await this.buildCategoryLayout(categorySlug, type);

    if (layout) {
      await this.cacheSet(cacheKey, layout);
      this.logger.log(`Cached layout for: ${categorySlug} ${type ? `(${type})` : ''}`);
    }

    return layout;
  }

  async buildCategoryLayout(categorySlug: string, type?: CategoryLayoutType): Promise<CategoryLayout | null> {
    const where: any = { categorySlug };
    if (type) {
      where.type = type;
    }

    const layout = await this.prisma.categoryLayout.findFirst({
      where,
      include: {
        items: {
          where: { isActive: true },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!layout || !layout.isActive) {
      return null;
    }

    const now = new Date();
    if (layout.startDate && layout.startDate > now) {
      return null;
    }
    if (layout.endDate && layout.endDate < now) {
      return null;
    }

    return {
      id: layout.id,
      categorySlug: layout.categorySlug,
      title: layout.title ?? null,
      subtitle: layout.subtitle ?? null,
      isActive: layout.isActive,
      position: layout.position,
      styleConfig: layout.styleConfig ?? null,
      type: layout.type,
      items: layout.items.map(item => ({
        id: item.id,
        title: item.title ?? null,
        subtitle: item.subtitle ?? null,
        imageUrl: item.imageUrl ?? null,
        isActive: item.isActive,
        position: item.position,
        linkType: item.linkType,
        linkValue: item.linkValue ?? null,
        styleConfig: item.styleConfig ?? null,
        videoUrl: item.videoUrl ?? null,
      })),
    };
  }

  async getCategoryLayouts(categorySlug: string, type?: CategoryLayoutType): Promise<CategoryLayout[]> {
    const where: any = { categorySlug };
    if (type) {
      where.type = type;
    }

    const layouts = await this.prisma.categoryLayout.findMany({
      where,
      include: {
        items: {
          where: { isActive: true },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { position: 'asc' },
    });

    const now = new Date();
    return layouts.filter(layout => {
      if (!layout.isActive) return false;
      if (layout.startDate && layout.startDate > now) return false;
      if (layout.endDate && layout.endDate < now) return false;
      return true;
    });
  }

  async invalidateCache(categorySlug?: string): Promise<{ success: boolean; message: string }> {
    // Skip caching if Redis is not available
    if (!this.redis) {
      this.logger.debug('Redis not available, skipping cache invalidation');
      return { success: true, message: 'Cache disabled' };
    }

    try {
      if (categorySlug) {
        const key = this.getCacheKey(categorySlug);
        await this.redis.del(key);
        this.logger.warn(`Cache invalidated for category: ${categorySlug}`);
        return { success: true, message: `Cache purged for ${categorySlug}` };
      }

      // Invalidate all category layouts
      const keys = await this.redis.keys('CATEGORY_LAYOUT_*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      this.logger.warn(`Redis Cache Invalidated for ${keys.length} categories`);
      return { success: true, message: `Cache purged for ${keys.length} categories` };
    } catch (error) {
      this.logger.warn('Redis cache invalidation failed, continuing without cache', error.message);
      return { success: true, message: 'Cache unavailable, operation completed' };
    }
  }

  // ── admin methods ────────────────────────────────────────────────────────
  async createLayout(data: {
    categorySlug: string;
    title?: string;
    subtitle?: string;
    type: CategoryLayoutType;
    styleConfig?: any;
    position?: number;
    startDate?: Date;
    endDate?: Date;
    items?: Array<{
      title?: string;
      subtitle?: string;
      imageUrl?: string;
      linkType?: string;
      linkValue?: string;
      styleConfig?: any;
      videoUrl?: string;
      position?: number;
    }>;
  }) {
    const { items, ...layoutData } = data;

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.categoryLayout.findFirst({
        where: {
          categorySlug: layoutData.categorySlug,
          type: layoutData.type,
        },
      });

      if (existing) {
        throw new Error(`Layout of type ${layoutData.type} already exists for category: ${layoutData.categorySlug}`);
      }

      const layout = await tx.categoryLayout.create({
        data: {
          ...layoutData,
          position: layoutData.position ?? 0,
          items: {
            create: items?.map(item => ({
              title: item.title,
              subtitle: item.subtitle,
              imageUrl: item.imageUrl,
              linkType: item.linkType,
              linkValue: item.linkValue,
              styleConfig: item.styleConfig,
              videoUrl: item.videoUrl,
              position: item.position,
            })) || [],
          },
        },
        include: { items: true },
      });

      await this.invalidateCache(layoutData.categorySlug);
      return layout;
    });
  }

async updateLayout(layoutId: number, data: any) {
  return this.prisma.$transaction(async (tx) => {
    const { items, ...layoutData } = data;
    return tx.categoryLayout.update({
      where: { id: layoutId },
      data: {
        ...layoutData,
        items: {
          deleteMany: { layoutId },
          create: items || [],
        },
      },
    });
  });
}
async deleteLayout(layoutId: number) {
  await this.prisma.categoryLayout.delete({ where: { id: layoutId } });
  return { success: true, message: 'Deleted' };
}

async updateLayoutPositions(categorySlug: string, positions: { id: number, position: number }[]) {
  return this.prisma.$transaction(
    positions.map((p) =>
      this.prisma.categoryLayout.update({
        where: { id: p.id, categorySlug },
        data: { position: p.position },
      })
    )
  ).then(async (res) => {
    await this.invalidateCache(categorySlug);
    return res;
  });
}

  async getAllLayouts(): Promise<any[]> {
    return this.prisma.categoryLayout.findMany({
      orderBy: { position: 'asc' },
      include: { items: true },
    });
  }
}
