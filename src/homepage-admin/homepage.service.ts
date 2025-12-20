import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as NodeCache from 'node-cache';
// Define a type for the cached data for clarity
type HomepageLayout = Awaited<ReturnType<HomepageService['buildHomepageLayout']>>;

@Injectable()
export class HomepageService implements OnModuleInit {
  // In-memory cache: TTL of 5 minutes (300 seconds).
  // This means the homepage is fetched from the DB at most once every 5 minutes,
  // making it extremely fast for subsequent users.
  private readonly cache = new NodeCache({ stdTTL: 300 });
  private readonly CACHE_KEY = 'HOMEPAGE_LAYOUT';

  constructor(private prisma: PrismaService) {}

  // This lifecycle hook ensures the cache is warm when the app starts
  async onModuleInit() {
    console.log('Warming up homepage cache...');
    // await this.getHomepage();
  }

  /**
   * Public method to get the homepage layout.
   * It tries to get data from the cache first. If not available,
   * it fetches from the DB, stores it in the cache, and then returns it.
   */
  async getHomepage(): Promise<HomepageLayout> {
    const cachedData = this.cache.get<HomepageLayout>(this.CACHE_KEY);

    if (cachedData) {
      console.log('Serving homepage from cache.');
      return cachedData;
    }

    console.log('Cache miss. Building homepage layout from database.');
    const freshData = await this.buildHomepageLayout();
    this.cache.set(this.CACHE_KEY, freshData);
    
    return freshData;
  }

  /**
   * Fetches and builds the homepage structure from the database.
   * This is the core database query.
   */
  async buildHomepageLayout() {
    return this.prisma.homepageSection.findMany({
      where: {
        // --- IMPORTANT FILTERS FOR PUBLIC API ---
        isActive: true, // Only fetch active sections
        AND: [
          {
            OR: [
              { startDate: null },
              { startDate: { lte: new Date() } }, // Section has started
            ],
          },
          {
            OR: [
              { endDate: null },
              { endDate: { gte: new Date() } }, // Section has not ended
            ],
          },
        ],
      },
      orderBy: {
        position: 'asc', // Order sections correctly
      },
      select: {
        // --- SELECT ONLY THE FIELDS THE CLIENT NEEDS ---
        id: true,
        title: true,
        subtitle: true,
        type: true,
        styleConfig: true,
        items: {
          where: {
            isActive: true, // Only fetch active items within sections
          },
          orderBy: {
            position: 'asc', // Order items correctly
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

  /**
   * Method to be called by a webhook or cron job whenever an admin
   * makes a change, ensuring the cache is always fresh.
   */
  public invalidateCache(): void {
    console.log('Homepage cache invalidated by admin action.');
    this.cache.del(this.CACHE_KEY);
    // Optional: Re-warm the cache immediately
    this.getHomepage(); 
  }
}