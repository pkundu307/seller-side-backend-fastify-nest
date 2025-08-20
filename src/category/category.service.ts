// src/categories/categories.service.ts

import { BadRequestException, ConflictException, Injectable, NotFoundException, Param } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service'; // Adjust path if needed
import { AddAttributesBatchDto } from './dto/create-attribute.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { error } from 'console';
// src/utils/slugify.ts
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}


export type CategoryPathSearchResult = {
  ids: string[];
  names: string[];
  fullPath: string;
};

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  // --- CATEGORY CRUD ---

  async createCategory(createCategoryDto: CreateCategoryDto) {
    // If a parentId is provided, first check if it exists
    if (createCategoryDto.parentId) {
      const parentExists = await this.prisma.category.findUnique({
        where: { id: createCategoryDto.parentId },
      });
      if (!parentExists) {
        throw new NotFoundException(`Parent category with ID ${createCategoryDto.parentId} not found.`);
      }
    }

    try {
      const slug = this.generateSlug(createCategoryDto.name);
      return await this.prisma.category.create({
        data: {
          name: createCategoryDto.name,
          parentId: createCategoryDto.parentId,
          slug: slug, // Assuming you have a slug field
        },
      });
    } catch (error) {
      // Handle potential unique constraint errors if you have them
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`A category with this name might already exist.`);
      }
      throw error;
    }
  }

  // --- EXISTING METHODS ---

  async getTopLevelCategories() {
    return this.prisma.category.findMany({
      where: { parentId: null },
      orderBy: { name: 'asc' },
    });
  }

  async getChildrenByParentId(parentId: number) { // Changed type to number
    return this.prisma.category.findMany({
      where: { parentId: parentId },
      orderBy: { name: 'asc' },
    });
  }

  async searchCategories(query: string): Promise<CategoryPathSearchResult[]> {
    // Your existing search logic is great, no changes needed here.
    if (!query || query.trim().length < 2) return [];
    // ... (rest of your search code)
    const results = await this.prisma.$queryRaw<
  { path_ids: number[]; path_names: string[] }[]
>`
  WITH RECURSIVE CategoryPath AS (
    -- Anchor member: Start with categories matching the search query
    SELECT
      id,
      name,
      "parentId",
      ARRAY[id] AS path_ids,
      --  <<<<<<<<<<<<<<<<<< THE FIX IS HERE >>>>>>>>>>>>>>>>>>
      ARRAY[name]::TEXT[] AS path_names
    FROM
      category
    WHERE
      name ILIKE ${'%' + query + '%'}

    UNION ALL

    -- Recursive member: Join with parent category
    SELECT
      c.id,
      c.name,
      c."parentId",
      c.id || cp.path_ids,
      c.name || cp.path_names
    FROM
      category c
    JOIN
      CategoryPath cp ON c.id = cp."parentId"
  )
  -- Select the final paths when we've reached the root (parentId is NULL)
  SELECT
    path_ids,
    path_names
  FROM
    CategoryPath
  WHERE
    "parentId" IS NULL;
`;

// Format the raw SQL result into a more friendly structure for the frontend
return results.map((p) => ({
  ids: p.path_ids.reverse().map(String),
  names: p.path_names.reverse(),
  fullPath: p.path_names.reverse().join(' > '),
}));
  }

  // --- ATTRIBUTE MANAGEMENT ---
   
  async addAttributesToCategoryBatch(dto: AddAttributesBatchDto) {
    const { categoryId, attributes } = dto;

    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID "${categoryId}" not found.`);
    }

    const childCount = await this.prisma.category.count({
      where: { parentId: category.id },
    });

    if (childCount > 0) {
      console.log(childCount);
      
      throw new BadRequestException('Attributes can only be added to child-most categories.');
    }

    try {
      const createdAttributes = await this.prisma.$transaction(
        attributes.map(attributeData =>
          this.prisma.attribute.create({
            data: {
              name: attributeData.name,
              categoryId: category.id,
              options: {
                create: attributeData.options.map((opt, index) => ({
                  value: opt.value,
                  // --- THE FIX IS HERE ---
                  // Now calling your specific slugify function correctly
                  slug: slugify(opt.value),
                  // -----------------------
                  position: index,
                })),
              },
            },
            include: {
              options: true,
            },
          })
        )
      );
      return createdAttributes;

    } catch (error) {
        if (error.code === 'P2002') {
            throw new BadRequestException('One or more attribute names or option values already exist for this category.');
        }
        throw error;
    }
  }

  
  // A helper function for creating slugs
  private generateSlug(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  }

// categories.service.ts
 async getAttributesByCategoryId(categoryId: number) {
    // USE `findUnique` because 'id' is a primary key. This is very fast.
    const category = await this.prisma.category.findUnique({
      where: {
        id: categoryId, // Search by the unique ID
      },
      include: {
        // The include clause remains the same, it's already perfect.
        attributes: {
          orderBy: { position: 'asc' },
          include: {
            options: {
              orderBy: { position: 'asc' },
            },
          },
        },
      },
    });

    // The rest of the logic is the same.
    if (!category) {
      throw new NotFoundException(`Category with ID "${categoryId}" not found`);
    }

    // Return only the attributes array, as before.
    return category.attributes;
  }

}