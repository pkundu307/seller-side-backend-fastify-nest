import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  // Fetch all parent categories (where parentId is null)
  async getTopLevelCategories() {
    return this.prisma.category.findMany({
      where: {
        parentId: null,
      },
      orderBy: {
        name: 'asc', // optional: sort alphabetically
      },
    });
  }

   async getChildrenByParentId(parentId: string) {
    return this.prisma.category.findMany({
      where: {
        parentId: Number(parentId),
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
}
