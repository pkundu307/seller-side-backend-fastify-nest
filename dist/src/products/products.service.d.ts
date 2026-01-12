import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from './utils/s3Service';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { Prisma } from '@prisma/client';
import { UpdateProductDto } from './dto/update-product.dto';
export declare class ProductsService {
    private prisma;
    private s3Service;
    constructor(prisma: PrismaService, s3Service: S3Service);
    findBusinessById(businessId: string): Promise<{
        id: string;
        name: string;
        ownerId: string;
    } | null>;
    getFeaturedProductsByCategory(categoryId: number, paginationQuery: PaginationQueryDto): Promise<{
        type: string;
        category: {
            id: number;
            name: string;
            slug: string;
        };
        children: {
            products: {
                id: any;
                title: any;
                description: any;
                slug: any;
                businessName: any;
                numberOfReviews: any;
                price: any;
                mrp: any;
                images: any[];
                isCustomizable: any;
            }[];
            id: number;
            name: string;
            slug: string;
        }[];
        products?: undefined;
        pagination?: undefined;
    } | {
        type: string;
        category: {
            id: number;
            name: string;
            slug: string;
        };
        products: {
            id: any;
            title: any;
            description: any;
            slug: any;
            businessName: any;
            numberOfReviews: any;
            price: any;
            mrp: any;
            images: any[];
            isCustomizable: any;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            lastPage: number;
        };
        children?: undefined;
    }>;
    private getFeaturedProductSelect;
    private processProduct;
    createProduct(businessId: string, formData: any): Promise<{
        success: boolean;
        message: string;
        data: {
            category: {
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
            };
            variants: ({
                attributeValues: ({
                    attribute: {
                        name: string;
                    };
                    attributeOption: {
                        value: string;
                    };
                } & {
                    id: number;
                    variantId: string;
                    attributeId: number;
                    attributeOptionId: number;
                })[];
            } & {
                id: string;
                createdAt: Date;
                length: Prisma.Decimal | null;
                description: string | null;
                updatedAt: Date;
                isDefault: boolean;
                productId: string;
                status: import(".prisma/client").$Enums.VariantStatus;
                images: string[];
                sku: string;
                price: Prisma.Decimal;
                mrp: Prisma.Decimal | null;
                stock: number;
                weightInGrams: number | null;
                hsnCode: string | null;
                sacCode: string | null;
                purchasePrice: Prisma.Decimal | null;
                purchasePriceType: string | null;
                tax: string | null;
                minStockCount: Prisma.Decimal | null;
                isMinStockAlertEnabled: boolean | null;
                dimensionUnit: string | null;
                height: Prisma.Decimal | null;
                width: Prisma.Decimal | null;
            })[];
        } & {
            id: string;
            createdAt: Date;
            description: string | null;
            title: string;
            categoryId: number;
            slug: string;
            updatedAt: Date;
            metaTitle: string | null;
            metaDescription: string | null;
            tags: string[];
            images: string[];
            businessId: string;
            isFeatured: boolean;
            isCustomizable: boolean;
            customizationConfig: Prisma.JsonValue | null;
            isPublished: boolean;
            publishDate: Date | null;
            model3dUrl: string | null;
            isArable: boolean;
            licenseDocumentUrl: string | null;
            brand: string | null;
        };
    }>;
    getProductsByBusiness(businessId: string, paginationQuery: PaginationQueryDto, userId: string): Promise<{
        data: {
            id: string;
            title: string;
            slug: string;
            images: string[];
            isPublished: boolean;
            price: Prisma.Decimal | null;
            stock: number | null;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
        };
    }>;
    getProductByIdForBusiness(businessId: string, productId: string, userId: string): Promise<{
        category: {
            id: number;
            name: string;
        };
        variants: ({
            attributeValues: ({
                attribute: {
                    id: number;
                    name: string;
                };
                attributeOption: {
                    id: number;
                    value: string;
                };
            } & {
                id: number;
                variantId: string;
                attributeId: number;
                attributeOptionId: number;
            })[];
        } & {
            id: string;
            createdAt: Date;
            length: Prisma.Decimal | null;
            description: string | null;
            updatedAt: Date;
            isDefault: boolean;
            productId: string;
            status: import(".prisma/client").$Enums.VariantStatus;
            images: string[];
            sku: string;
            price: Prisma.Decimal;
            mrp: Prisma.Decimal | null;
            stock: number;
            weightInGrams: number | null;
            hsnCode: string | null;
            sacCode: string | null;
            purchasePrice: Prisma.Decimal | null;
            purchasePriceType: string | null;
            tax: string | null;
            minStockCount: Prisma.Decimal | null;
            isMinStockAlertEnabled: boolean | null;
            dimensionUnit: string | null;
            height: Prisma.Decimal | null;
            width: Prisma.Decimal | null;
        })[];
    } & {
        id: string;
        createdAt: Date;
        description: string | null;
        title: string;
        categoryId: number;
        slug: string;
        updatedAt: Date;
        metaTitle: string | null;
        metaDescription: string | null;
        tags: string[];
        images: string[];
        businessId: string;
        isFeatured: boolean;
        isCustomizable: boolean;
        customizationConfig: Prisma.JsonValue | null;
        isPublished: boolean;
        publishDate: Date | null;
        model3dUrl: string | null;
        isArable: boolean;
        licenseDocumentUrl: string | null;
        brand: string | null;
    }>;
    private generateSlug;
    updateProduct(productId: string, userId: string, dto: UpdateProductDto, newProductImages: any[], newVariantImagesMap: Map<string, any[]>, newModel3dFile?: any, newSlicenseDocumentFile?: any): Promise<({
        category: {
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
        };
        variants: ({
            attributeValues: ({
                attribute: {
                    id: number;
                    name: string;
                    categoryId: number;
                    position: number;
                };
                attributeOption: {
                    id: number;
                    value: string;
                    slug: string;
                    position: number;
                    attributeId: number;
                };
            } & {
                id: number;
                variantId: string;
                attributeId: number;
                attributeOptionId: number;
            })[];
        } & {
            id: string;
            createdAt: Date;
            length: Prisma.Decimal | null;
            description: string | null;
            updatedAt: Date;
            isDefault: boolean;
            productId: string;
            status: import(".prisma/client").$Enums.VariantStatus;
            images: string[];
            sku: string;
            price: Prisma.Decimal;
            mrp: Prisma.Decimal | null;
            stock: number;
            weightInGrams: number | null;
            hsnCode: string | null;
            sacCode: string | null;
            purchasePrice: Prisma.Decimal | null;
            purchasePriceType: string | null;
            tax: string | null;
            minStockCount: Prisma.Decimal | null;
            isMinStockAlertEnabled: boolean | null;
            dimensionUnit: string | null;
            height: Prisma.Decimal | null;
            width: Prisma.Decimal | null;
        })[];
    } & {
        id: string;
        createdAt: Date;
        description: string | null;
        title: string;
        categoryId: number;
        slug: string;
        updatedAt: Date;
        metaTitle: string | null;
        metaDescription: string | null;
        tags: string[];
        images: string[];
        businessId: string;
        isFeatured: boolean;
        isCustomizable: boolean;
        customizationConfig: Prisma.JsonValue | null;
        isPublished: boolean;
        publishDate: Date | null;
        model3dUrl: string | null;
        isArable: boolean;
        licenseDocumentUrl: string | null;
        brand: string | null;
    }) | null>;
    getInventoryStats(businessId: string, userId: string): Promise<{
        totalStockValue: number;
        negativeStockCount: number;
        lowStockCount: number;
        outOfStockCount: number;
    }>;
    getProductDetailsForCustomer(productId: string): Promise<{
        business: {
            id: string;
            name: string;
            address: string;
            city: string;
            state: string;
            country: string;
            gstNumber: string;
            phone: string;
            isVerified: boolean;
        };
        category: {
            id: number;
            name: string;
            slug: string;
            parent: {
                id: number;
                name: string;
                slug: string;
            } | null;
        };
        reviews: {
            id: string;
            createdAt: Date;
            rating: number;
            comment: string | null;
        }[];
        variants: ({
            attributeValues: ({
                attribute: {
                    id: number;
                    name: string;
                };
                attributeOption: {
                    id: number;
                    value: string;
                    slug: string;
                };
            } & {
                id: number;
                variantId: string;
                attributeId: number;
                attributeOptionId: number;
            })[];
        } & {
            id: string;
            createdAt: Date;
            length: Prisma.Decimal | null;
            description: string | null;
            updatedAt: Date;
            isDefault: boolean;
            productId: string;
            status: import(".prisma/client").$Enums.VariantStatus;
            images: string[];
            sku: string;
            price: Prisma.Decimal;
            mrp: Prisma.Decimal | null;
            stock: number;
            weightInGrams: number | null;
            hsnCode: string | null;
            sacCode: string | null;
            purchasePrice: Prisma.Decimal | null;
            purchasePriceType: string | null;
            tax: string | null;
            minStockCount: Prisma.Decimal | null;
            isMinStockAlertEnabled: boolean | null;
            dimensionUnit: string | null;
            height: Prisma.Decimal | null;
            width: Prisma.Decimal | null;
        })[];
    } & {
        id: string;
        createdAt: Date;
        description: string | null;
        title: string;
        categoryId: number;
        slug: string;
        updatedAt: Date;
        metaTitle: string | null;
        metaDescription: string | null;
        tags: string[];
        images: string[];
        businessId: string;
        isFeatured: boolean;
        isCustomizable: boolean;
        customizationConfig: Prisma.JsonValue | null;
        isPublished: boolean;
        publishDate: Date | null;
        model3dUrl: string | null;
        isArable: boolean;
        licenseDocumentUrl: string | null;
        brand: string | null;
    }>;
    private getCategoryAndAllChildrenIds;
    getCategoryPageDataBySlug(categorySlug: string, paginationQuery: PaginationQueryDto): Promise<{
        type: string;
        category: {
            id: number;
            name: string;
            slug: string;
        };
        children: {
            products: {
                id: any;
                title: any;
                description: any;
                slug: any;
                businessName: any;
                numberOfReviews: any;
                price: any;
                mrp: any;
                images: any[];
                isCustomizable: any;
            }[];
            id: number;
            name: string;
            slug: string;
        }[];
        products?: undefined;
        pagination?: undefined;
    } | {
        type: string;
        category: {
            id: number;
            name: string;
            slug: string;
        };
        products: {
            id: any;
            title: any;
            description: any;
            slug: any;
            businessName: any;
            numberOfReviews: any;
            price: any;
            mrp: any;
            images: any[];
            isCustomizable: any;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            lastPage: number;
        };
        children?: undefined;
    }>;
}
