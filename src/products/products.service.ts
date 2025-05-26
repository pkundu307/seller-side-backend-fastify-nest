import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any) {
    let {
      title,
      description,
      price,
      images,
      categories,
      variants,
    } = data;
    console.log(price);
    price = Number(price);

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
       businessId: data.userId,
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
  async findAll() {
    return this.prisma.product.findMany({
      include: {
        categories: true,
        variants: true,
      },
    });
  }

}
