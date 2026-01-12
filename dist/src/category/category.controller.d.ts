import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { AddAttributesBatchDto } from './dto/create-attribute.dto';
export declare class CategoryController {
    private readonly categoriesService;
    constructor(categoriesService: CategoryService);
    create(createCategoryDto: CreateCategoryDto): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        description: string | null;
        parentId: number | null;
        slug: string;
        updatedAt: Date;
        gstRate: import("@prisma/client/runtime/library").Decimal;
        commissionRate: import("@prisma/client/runtime/library").Decimal | null;
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
        gstRate: import("@prisma/client/runtime/library").Decimal;
        commissionRate: import("@prisma/client/runtime/library").Decimal | null;
        imageUrl: string | null;
        position: number;
        isActive: boolean;
        metaTitle: string | null;
        metaDescription: string | null;
    }[]>;
    getChildren(parentId: number): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        description: string | null;
        parentId: number | null;
        slug: string;
        updatedAt: Date;
        gstRate: import("@prisma/client/runtime/library").Decimal;
        commissionRate: import("@prisma/client/runtime/library").Decimal | null;
        imageUrl: string | null;
        position: number;
        isActive: boolean;
        metaTitle: string | null;
        metaDescription: string | null;
    }[]>;
    searchCategories(query: string): Promise<import("./category.service").CategoryPathSearchResult[]>;
    addAttributes(dto: AddAttributesBatchDto): Promise<({
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
    getAllCategoriesAsTree(): Promise<import("./category.service").SimplifiedCategoryNode[]>;
}
