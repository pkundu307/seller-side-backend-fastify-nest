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

    // 1. Early return if no filters provided
    if (!trimmedQuery && !categoryId && !productId) {
      return [];
    }

    // 2. Initialize Filter Object
    const where: Prisma.ProductWhereInput = {
      isPublished: true,
      // If categoryId exists, filter by it
      ...(categoryId && { categoryId: parseInt(categoryId, 10) }),
    };

    // 3. Handle Text Search (Vector + Fuzzy)
    if (trimmedQuery) {
      type ProductIdResult = { id: string };

      // A. Try Full Text Search (Fastest & Most Accurate)
      // Use 'plainto_tsquery' instead of manual splitting. 
      // It handles spaces and special chars (e.g. "Salt & Pepper") automatically.
      let matchingProductIds = await this.prisma.$queryRaw<ProductIdResult[]>`
        SELECT id FROM "Product"
        WHERE search_vector @@ plainto_tsquery('english', ${trimmedQuery})
      `;

      // B. Fallback to Fuzzy Search (Trigrams) if no exact matches
      if (matchingProductIds.length === 0) {
        // console.log("Falling back to fuzzy search...");
        
        // Note: This requires a GIN index on 'title' with gin_trgm_ops (See below)
        matchingProductIds = await this.prisma.$queryRaw<ProductIdResult[]>`
          SELECT id FROM "Product"
          WHERE title % ${trimmedQuery}
          LIMIT 20
        `;
      }

      const foundIds = matchingProductIds.map((p) => p.id);

      // If text search returned nothing, return empty immediately
      if (foundIds.length === 0) {
        return [];
      }

      // 4. Combine IDs logic safely
      if (productId) {
        // If user asked for specific ID *AND* text search, 
        // ensure that specific ID is in the text search results
        if (!foundIds.includes(productId)) {
          return [];
        }
        where.id = productId;
      } else {
        // Otherwise, filter by the found text results
        where.id = { in: foundIds };
      }
    } else if (productId) {
        // If no text search, but specific ID provided
        where.id = productId;
    }

    // 5. Fetch Final Data
    const products = await this.prisma.product.findMany({
      where,
      take: 20, // Always limit results for performance
      select: {
        id: true,
        title: true,
        slug: true,
        images: true, 
        category: {
          select: { name: true },
        },
        variants: {
          orderBy: { isDefault: 'desc' }, // Show default variant first
          take: 1, // We only need 1 price/image for the card
          select: {
            id: true,
            price: true,
            images: true,
            mrp: true, // Useful to show discount
          },
        },
      },
    });

    return products;
  }
}