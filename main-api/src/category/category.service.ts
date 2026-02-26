// src/categories/categories.service.ts

import { BadRequestException, ConflictException, Injectable, NotFoundException, Param } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service'; // Adjust path if needed
import { AddAttributesBatchDto, CreateAttributeOptionDto } from './dto/create-attribute.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Category } from '@prisma/client';
import * as NodeCache from 'node-cache';
import { error } from 'console';import { 
  Logger 
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { } from '@prisma/client';
import { UpdateCategoryDto } from './dto/update-category.dto';

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
    console.log(createCategoryDto.gstRate,createCategoryDto.name);
    
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
          gstRate: createCategoryDto.gstRate,
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

    this.logger.log(`--- Starting Batch Attribute Creation for Category: ${categoryId} ---`);
    this.logger.log(`Received Payload: ${JSON.stringify(attributes, null, 2)}`);

    // 1. Check Category Existence
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID "${categoryId}" not found.`);
    }

    // 2. Check Hierarchy
    const childCount = await this.prisma.category.count({
      where: { parentId: category.id },
    });

    if (childCount > 0) {
      this.logger.warn(`Category ${categoryId} has ${childCount} children. Cannot add attributes.`);
      throw new BadRequestException('Attributes can only be added to child-most categories.');
    }

    // 3. Pre-Validation: Check for duplicates within the INPUT array
    // (This causes P2002 errors even if DB is empty)
    const names = attributes.map(a => a.name.toLowerCase());
    const uniqueNames = new Set(names);
    if (names.length !== uniqueNames.size) {
      this.logger.error('Duplicate attribute names found in the input payload.');
      throw new BadRequestException('Duplicate attribute names sent in the same request.');
    }

    try {
      this.logger.log(`Validation passed. Attempting DB Transaction...`);

      const createdAttributes = await this.prisma.$transaction(
        attributes.map(attributeData => {
          
          // Log individual slug generation to check for slug collisions
          const optionsData = attributeData.options.map((opt, index) => {
            const slug = slugify(opt.value);
            this.logger.debug(`Generating Option: ${opt.value} -> Slug: ${slug}`);
            return {
              value: opt.value,
              slug: slug,
              position: index,
            };
          });

          return this.prisma.attribute.create({
            data: {
              name: attributeData.name,
              categoryId: category.id,
              options: {
                create: optionsData,
              },
            },
            include: {
              options: true,
            },
          });
        })
      );

      this.logger.log(`Successfully created ${createdAttributes.length} attributes.`);
      return createdAttributes;

    } catch (error) {
        this.logger.error(`Transaction Failed! Code: ${error.code}`);
        this.logger.error(`Error Meta: ${JSON.stringify(error.meta)}`); // This tells you WHICH field failed
        
        if (error.code === 'P2002') {
            const target = error.meta?.target;
            this.logger.error(`Unique constraint violation on: ${target}`);
            
            throw new BadRequestException(
              `Conflict: The attribute or option already exists. Violation on field: [${target}]`
            );
        }
        
        // Log the full error for other unknown issues
        console.error(error);
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

  async getAdminCategoryTree() {
    // Fetches up to 3 levels deep (Parent -> Child -> SubChild)
    // Includes Attributes and their Options at every level
    // Includes GST Rate
    
    // FIX: Added 'as const' to ensure 'asc' is treated as a specific literal, not a string
    const attributeInclude = {
      include: {
        options: {
          orderBy: { position: 'asc' as const } 
        }
      }
    };

    return this.prisma.category.findMany({
      where: { parentId: null }, // Start from roots
      orderBy: { position: 'asc' }, 
      include: {
        attributes: attributeInclude,
        children: {
          orderBy: { position: 'asc' },
          include: {
            attributes: attributeInclude,
            children: { // Level 3
              orderBy: { position: 'asc' },
              include: {
                attributes: attributeInclude
              }
            }
          }
        }
      }
    });
  }

  // ==========================================
  // ADMIN: ADD ATTRIBUTE OPTION
  // ==========================================
  async addAttributeOption(attributeId: number, dto: CreateAttributeOptionDto) {
    const attribute = await this.prisma.attribute.findUnique({
      where: { id: attributeId }
    });

    if (!attribute) {
      throw new NotFoundException('Attribute not found');
    }

    const slug = slugify(dto.value);

    // Check for duplicate value in this attribute
    const existing = await this.prisma.attributeOption.findFirst({
      where: { attributeId, value: dto.value }
    });

    if (existing) {
      throw new ConflictException('This option value already exists for this attribute');
    }

    // Get max position to append to end
    const lastOption = await this.prisma.attributeOption.findFirst({
      where: { attributeId },
      orderBy: { position: 'desc' }
    });
    const newPosition = (lastOption?.position ?? -1) + 1;

    return this.prisma.attributeOption.create({
      data: {
        attributeId,
        value: dto.value,
        slug: slug,
        position: newPosition
      }
    });
  }

  // ==========================================
  // ADMIN: DELETE ATTRIBUTE OPTION
  // ==========================================
  async deleteAttributeOption(optionId: number) {
    // Check if it exists
    const option = await this.prisma.attributeOption.findUnique({
      where: { id: optionId }
    });
    if (!option) throw new NotFoundException('Option not found');

    // Optional: Check if any Product Variant is using this option?
    // If you want to block deletion if used:
    const usageCount = await this.prisma.variantAttributeValue.count({
      where: { attributeOptionId: optionId }
    });
    if (usageCount > 0) {
      throw new BadRequestException(`Cannot delete. This option is used by ${usageCount} products.`);
    }

    return this.prisma.attributeOption.delete({
      where: { id: optionId }
    });
  }

  // ==========================================
  // ADMIN: DELETE ATTRIBUTE
  // ==========================================
  async deleteAttribute(attributeId: number) {
    // Schema has Cascade delete for Options, so deleting Attribute deletes Options automatically.
    // However, we must check if Products are using this Attribute.

    const usageCount = await this.prisma.variantAttributeValue.count({
      where: { attributeId: attributeId }
    });

    if (usageCount > 0) {
      throw new BadRequestException(`Cannot delete attribute. It is currently assigned to ${usageCount} product variants.`);
    }

    try {
      return await this.prisma.attribute.delete({
        where: { id: attributeId }
      });
    } catch (e) {
      if (e.code === 'P2025') throw new NotFoundException('Attribute not found');
      throw e;
    }
  }

  // ==========================================
  // ADMIN: DELETE CATEGORY (RECURSIVE)
  // ==========================================
  async deleteCategory(categoryId: number) {
    // 1. Check if exists
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) throw new NotFoundException('Category not found');

    // 2. Find all descendant IDs (Children, Grandchildren, etc.)
    // Because schema says onDelete: NoAction, we must manually find and delete them.
    const allDescendants = await this.prisma.$queryRaw<{ id: number }[]>`
      WITH RECURSIVE CategoryTree AS (
        SELECT id FROM category WHERE id = ${categoryId}
        UNION ALL
        SELECT c.id FROM category c
        INNER JOIN CategoryTree ct ON c."parentId" = ct.id
      )
      SELECT id FROM CategoryTree;
    `;

    const idsToDelete = allDescendants.map(r => r.id);

    // 3. Safety Check: Are products using any of these categories?
    const productCount = await this.prisma.product.count({
      where: { categoryId: { in: idsToDelete } }
    });

    if (productCount > 0) {
      throw new BadRequestException(`Cannot delete category hierarchy. There are ${productCount} products attached to these categories.`);
    }

    // 4. Perform Deletion in Transaction
    // We delete attributes first (though cascade works, explicit is safer for logging),
    // then categories.
    return this.prisma.$transaction(async (tx) => {
      // Attributes will be deleted automatically via relation cascade if set in DB,
      // but if we are deleting categories in bulk, we rely on the DB cascade for attributes -> category.
      
      // We must delete categories in reverse order of hierarchy to avoid FK issues 
      // OR since we are deleting the whole tree and no external refs exist (checked above),
      // we can try deleteMany. 
      // However, deleteMany doesn't guarantee order. 
      // The safest way with "NoAction" self-relation is to update parentId to NULL or delete bottom-up.
      // But purely deleting everything in the list usually works if Constraints are deferred or if we assume the standard flow.
      
      // Let's try deleting Attributes for these categories explicitly first (good for cleanup)
      await tx.attribute.deleteMany({
        where: { categoryId: { in: idsToDelete } }
      });

      // Now delete the categories. 
      // To satisfy "NoAction" on parentId, we delete the children first.
      // QueryRaw gives us a tree, but not necessarily sorted by depth.
      // A simple trick: Delete where id IN (...) is usually safe in Postgres if it's a batch, 
      // but to be 100% safe against "Foreign key violation: Key (id)=(X) is still referenced from table category":
      
      // We will loop through ids and try to delete. If one fails due to parent ref, we wait.
      // OR better: Update all "parentId" to NULL for these IDs first, then delete.
      // This breaks the links immediately.
      
      await tx.category.updateMany({
        where: { id: { in: idsToDelete } },
        data: { parentId: null }
      });

      // Now safe to delete all
      const result = await tx.category.deleteMany({
        where: { id: { in: idsToDelete } }
      });
      
      this.logger.log(`Deleted category tree for ID ${categoryId}. Removed ${result.count} categories.`);
      return { message: `Successfully deleted category and ${result.count - 1} subcategories.` };
    });
  }

async updateCategory(id: number, dto: UpdateCategoryDto) {
    // 1. Check if category exists
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException(`Category with ID ${id} not found`);
  console.log(category);
  
    // ✅ FIX 1: Explicitly define type as string | undefined
    let newSlug: string | undefined;

    // 2. If name is changing, regenerate slug
    if (dto.name && dto.name !== category.name) {
      newSlug = slugify(dto.name);
      
      // Check for collision (excluding current category)
      const existing = await this.prisma.category.findFirst({
        where: { 
          slug: newSlug,
          id: { not: id } 
        }
      });

      if (existing) {
        newSlug = `${newSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
      }
    }

    try {
      // 3. Perform Update
      const updatedCategory = await this.prisma.category.update({
        where: { id },
        data: {
          ...dto,
          // ✅ FIX 2: Use ternary to ensure we spread an object, never undefined
          ...(newSlug ? { slug: newSlug } : {}),
        },
      });

      return updatedCategory;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException('Unique constraint violation (probably slug).');
        }
      }
      throw error;
    }
  }
}