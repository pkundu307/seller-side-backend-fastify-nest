import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddAttributesBatchDto } from './dto/create-attribute.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Category } from '@prisma/client';
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
export declare function slugify(text: string): string;
export type CategoryPathSearchResult = {
    ids: string[];
    names: string[];
    fullPath: string;
};
export declare class CategoryService {
    private prisma;
    private readonly logger;
    private cache;
    private readonly CACHE_KEY;
    constructor(prisma: PrismaService);
    createCategory(createCategoryDto: CreateCategoryDto): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        description: string | null;
        parentId: number | null;
        slug: string;
        updatedAt: Date;
        gstRate: Prisma.Decimal;
        commissionRate: Prisma.Decimal | null;
        imageUrl: string | null;
        position: number;
        isActive: boolean;
        metaTitle: string | null;
        metaDescription: string | null;
    }>;
    getTopLevelCategories(): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        description: string | null;
        parentId: number | null;
        slug: string;
        updatedAt: Date;
        gstRate: Prisma.Decimal;
        commissionRate: Prisma.Decimal | null;
        imageUrl: string | null;
        position: number;
        isActive: boolean;
        metaTitle: string | null;
        metaDescription: string | null;
    }[]>;
    getChildrenByParentId(parentId: number): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        description: string | null;
        parentId: number | null;
        slug: string;
        updatedAt: Date;
        gstRate: Prisma.Decimal;
        commissionRate: Prisma.Decimal | null;
        imageUrl: string | null;
        position: number;
        isActive: boolean;
        metaTitle: string | null;
        metaDescription: string | null;
    }[]>;
    searchCategories(query: string): Promise<CategoryPathSearchResult[]>;
    addAttributesToCategoryBatch(dto: AddAttributesBatchDto): Promise<({
        options: {
            id: number;
            value: string;
            slug: string;
            position: number;
            attributeId: number;
        }[];
    } & {
        id: number;
        name: string;
        categoryId: number;
        position: number;
    })[]>;
    private generateSlug;
    getAttributesByCategoryId(categoryId: number): Promise<({
        options: {
            id: number;
            value: string;
            slug: string;
            position: number;
            attributeId: number;
        }[];
    } & {
        id: number;
        name: string;
        categoryId: number;
        position: number;
    })[]>;
    getAllCategoriesAsTree(): Promise<SimplifiedCategoryNode[]>;
    handleDailyCacheRefresh(): Promise<void>;
    private buildAndCacheTree;
}
