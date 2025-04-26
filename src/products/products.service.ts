import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any, sellerId: number) {
    const {
      title,
      description,
      price,
      images,
      categories,
      variants,
    } = data;

    // create or connect categories
    const categoryConnections = categories.map((catName) => ({
      where: { name: catName },
      create: { name: catName },
    }));

    return this.prisma.product.create({
      data: {
        title,
        description,
        price,
        images,
        slug: title.toLowerCase().replace(/\s+/g, '-'),
        sellerId,
        categories: {
          connectOrCreate: categoryConnections,
        },
        variants: {
          create: variants, // e.g. [{ size: "M", color: "Red", price: 499, stock: 10 }]
        },
      },
      include: {
        categories: true,
        variants: true,
      },
    });
  }
}
