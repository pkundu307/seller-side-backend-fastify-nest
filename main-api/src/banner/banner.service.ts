import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BannersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Finds all promotional banners that are currently active.
   * Banners are ordered by their 'position' field in ascending order.
   */
  async findAllActive() {
          

    return this.prisma.promotionalBanner.findMany({
      
      where: {
        // Only return banners that are marked as active
        isActive: true,
      },
      orderBy: {
        // Order by position, so 0 comes first, then 1, etc.
        position: 'asc',
      },
    });
  }
}