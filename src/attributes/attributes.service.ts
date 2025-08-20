import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttributesService {
  constructor(private readonly prisma: PrismaService) {}

async getAttributesForCategory(categoryId: number) { // Renamed for clarity
  // Use findMany to get a list of records
  const attributes = await this.prisma.attribute.findMany({
    where: {
      categoryId: categoryId, // This is a valid filter for findMany
    },
    include: {
      options: {
        orderBy: { position: 'asc' },
      },
    },
    orderBy: {
      position: 'asc',
    },
  });

  // Since findMany can return an empty array, a 404 might not be needed
  // unless you want to ensure the category itself exists first.
  if (attributes.length === 0) {
    // Optional: Check if the category even exists to give a better error
    const categoryExists = await this.prisma.category.count({ where: { id: categoryId }});
    if (categoryExists === 0) {
      throw new NotFoundException(`Category with ID ${categoryId} not found.`);
    }
  }

  return attributes;
}
}