// src/product-search/product-search.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchProductsDto } from './dto/search-products.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductSearchService {
  constructor(private prisma: PrismaService) {}

  async searchProducts(searchDto: SearchProductsDto) {
    const { query, categoryId, slug } = searchDto; // <-- Destructure slug

    const where: Prisma.ProductWhereInput = {
      isPublished: true,
    };

    // --- THIS IS THE KEY CHANGE ---
    // If a slug is provided, it becomes the primary filter.
    if (slug) {
      where.slug = {
        equals: slug,
        mode: 'insensitive', // Good for case-insensitivity
      };
    } 
    // --- END OF CHANGE ---
    else {
      // If no slug, use the query and categoryId for general search
      if (categoryId) {
        where.categoryId = categoryId;
      }
      if (query) {
        where.OR = [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { variants: { some: { sku: { contains: query, mode: 'insensitive' } } } },
        ];
      }
    }

    const products = await this.prisma.product.findMany({
      where,
      take: 5, // As per your original description
      include: {
        variants: {
          take: 2, // Max 2 variants per product
          orderBy: { isDefault: 'desc' },
        },
      },
    });

    return products;
  }
  async findProductBySlug(slug: string) {
  const product = await this.prisma.product.findUnique({
    where: { slug: slug },
    include: {
      // Include all the details your product page needs
      category: true,
      business: { select: { name: true, slug: true } },
      variants: {
        include: {
          attributeValues: {
            include: {
              attribute: { select: { name: true } },
              attributeOption: { select: { value: true } },
            },
          },
        },
      },
      reviews: { take: 5, orderBy: { createdAt: 'desc' } },
    },
  });

  if (!product) {
    throw new NotFoundException(`Product with slug "${slug}" not found.`);
  }

  return product;

}}