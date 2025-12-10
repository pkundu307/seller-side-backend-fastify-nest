// src/categories/categories.service.ts

import { BadRequestException, ConflictException, Injectable, NotFoundException, Param } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service'; // Adjust path if needed
import { AddAttributesBatchDto } from './dto/create-attribute.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Category } from '@prisma/client';
import * as NodeCache from 'node-cache';
import { error } from 'console';import { 
  Logger 
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { } from '@prisma/client';

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}
export interface SimplifiedCategoryNode {
  id: number;
  name: string;
   slug: string;
  parentId: number | null;
  children: SimplifiedCategoryNode[];
}
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
    private readonly logger = new Logger(CategoryService.name);
    // private cache = new NodeCache({ stdTTL: 600 });
 private cache = new NodeCache({ stdTTL: 0 }); 
  private readonly CACHE_KEY = 'all_categories_tree_v2';
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



async getAllCategoriesAsTree(): Promise<SimplifiedCategoryNode[]> {
    // 1. CHANGE KEY to ensure you aren't getting old, flat data
    const cacheKey = 'all_categories_tree_v2'; 

    const cachedTree = this.cache.get<SimplifiedCategoryNode[]>(this.CACHE_KEY);
    if (cachedTree) {
      return cachedTree;


    }

     this.logger.warn('⚠️ Cache miss. Building category tree synchronously.');
    return this.buildAndCacheTree();
  }

    @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async handleDailyCacheRefresh() {
    this.logger.log('🔄 Cron Job: Starting daily category tree refresh...');
    const start = Date.now();
    
    await this.buildAndCacheTree();
    
    this.logger.log(`✅ Cron Job: Cache refreshed in ${Date.now() - start}ms`);
  }

  private async buildAndCacheTree(): Promise<SimplifiedCategoryNode[]> {
    // 1. Fetch data
    const allCategories = await this.prisma.category.findMany({
      select: {
        id: true,
        name: true,
        parentId: true,
        slug: true,
      },
      orderBy: { name: 'asc' },
    });

    // 2. Initialize Map and Roots
    const categoryMap = new Map<number, SimplifiedCategoryNode>();
    const rootCategories: SimplifiedCategoryNode[] = [];

    // Pass 1: Create the map with empty children arrays
    allCategories.forEach((category) => {
      categoryMap.set(category.id, { 
        ...category, 
        children: [] 
      });
    });

    // Pass 2: Link children to parents
    allCategories.forEach((category) => {
      const currentNode = categoryMap.get(category.id)!;

      if (category.parentId) {
        const parentNode = categoryMap.get(category.parentId);
        if (parentNode) {
          parentNode.children.push(currentNode);
        } else {
          // Orphan handling: If parent missing, treat as root
          rootCategories.push(currentNode);
        }
      } else {
        // No parentId = Root
        rootCategories.push(currentNode);
      }
    });

    // 3. Save to Cache (Sync operation)
    this.cache.set(this.CACHE_KEY, rootCategories);
    
    return rootCategories;
  }

}