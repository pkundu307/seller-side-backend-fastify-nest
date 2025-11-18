import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { SearchProductsDto } from './dto/search-products.dto';

@Injectable()
export class ProductSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async searchProducts(dto: SearchProductsDto) {
    const { query, categoryId, productId } = dto;
    const trimmedQuery = query?.trim();

    if (!trimmedQuery && !categoryId && !productId) {
      return [];
    }

    const where: Prisma.ProductWhereInput = {
      isPublished: true,
    };

    if (productId) {
      where.id = productId;
    }

    if (categoryId) {
      const parsedCategoryId = parseInt(categoryId, 10);
      if (isNaN(parsedCategoryId)) {
        throw new BadRequestException('Invalid category ID format.');
      }
      where.categoryId = parsedCategoryId;
    }

    if (trimmedQuery) {
      type ProductIdResult = { id: string };
      const searchQuery = trimmedQuery.split(' ').filter(term => term).join(' & ');

      let matchingProductIds = await this.prisma.$queryRaw<ProductIdResult[]>`
        SELECT id FROM "Product"
        WHERE search_vector @@ to_tsquery('english', ${searchQuery})
      `;

      if (matchingProductIds.length === 0) {
        console.log("No exact matches found. Falling back to fuzzy search...");
        await this.prisma.$executeRaw`SELECT set_limit(0.3);`;
        matchingProductIds = await this.prisma.$queryRaw<ProductIdResult[]>`
          SELECT id FROM "Product"
          WHERE title % ${trimmedQuery}
        `;
      }

      if (matchingProductIds.length === 0) {
        return [];
      }
      
      const ids = matchingProductIds.map(p => p.id);
      where.id = { in: ids };
    }

    // --- Final Optimized Data Fetching ---
    const products = await this.prisma.product.findMany({
      where,
      take: 5,
      select: { // ✅ Using `select` to fetch only the data we need for the UI
        // --- Essential Product Info ---
        id: true,
        title: true,
        slug: true,
        images: true, // Send the image array, frontend can take images[0]

        // --- Essential Category Info ---
        category: {
          select: {
            name: true,
          },
        },

        // --- Essential Variant Info ---
        variants: {
          orderBy: {
            isDefault: 'desc',
          },
          take: 2,
          select: {
            id: true,
            price: true,
            images: true, // Frontend can take the first image for a preview
          },
        },
      },
    });

    return products;
  }
}