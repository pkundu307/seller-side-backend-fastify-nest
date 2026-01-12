import { FastifyRequest } from 'fastify';
import { ProductsService } from './products.service';
import { PaginationQueryDto } from './dto/pagination-query.dto';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    addProduct(req: FastifyRequest, businessId: string): Promise<{
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
                gstRate: import("@prisma/client/runtime/library").Decimal;
                commissionRate: import("@prisma/client/runtime/library").Decimal | null;
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
                length: import("@prisma/client/runtime/library").Decimal | null;
                description: string | null;
                updatedAt: Date;
                isDefault: boolean;
                productId: string;
                status: import(".prisma/client").$Enums.VariantStatus;
                images: string[];
                sku: string;
                price: import("@prisma/client/runtime/library").Decimal;
                mrp: import("@prisma/client/runtime/library").Decimal | null;
                stock: number;
                weightInGrams: number | null;
                hsnCode: string | null;
                sacCode: string | null;
                purchasePrice: import("@prisma/client/runtime/library").Decimal | null;
                purchasePriceType: string | null;
                tax: string | null;
                minStockCount: import("@prisma/client/runtime/library").Decimal | null;
                isMinStockAlertEnabled: boolean | null;
                dimensionUnit: string | null;
                height: import("@prisma/client/runtime/library").Decimal | null;
                width: import("@prisma/client/runtime/library").Decimal | null;
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
            customizationConfig: import("@prisma/client/runtime/library").JsonValue | null;
            isPublished: boolean;
            publishDate: Date | null;
            model3dUrl: string | null;
            isArable: boolean;
            licenseDocumentUrl: string | null;
            brand: string | null;
        };
    }>;
    private parseMultipartData;
    private validateProductData;
    getProductsForBusiness(businessId: string, req: FastifyRequest, paginationQuery: PaginationQueryDto): Promise<{
        data: {
            id: string;
            title: string;
            slug: string;
            images: string[];
            isPublished: boolean;
            price: import("@prisma/client/runtime/library").Decimal | null;
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
    getProductById(req: FastifyRequest, businessId: string, productId: string): Promise<{
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
            length: import("@prisma/client/runtime/library").Decimal | null;
            description: string | null;
            updatedAt: Date;
            isDefault: boolean;
            productId: string;
            status: import(".prisma/client").$Enums.VariantStatus;
            images: string[];
            sku: string;
            price: import("@prisma/client/runtime/library").Decimal;
            mrp: import("@prisma/client/runtime/library").Decimal | null;
            stock: number;
            weightInGrams: number | null;
            hsnCode: string | null;
            sacCode: string | null;
            purchasePrice: import("@prisma/client/runtime/library").Decimal | null;
            purchasePriceType: string | null;
            tax: string | null;
            minStockCount: import("@prisma/client/runtime/library").Decimal | null;
            isMinStockAlertEnabled: boolean | null;
            dimensionUnit: string | null;
            height: import("@prisma/client/runtime/library").Decimal | null;
            width: import("@prisma/client/runtime/library").Decimal | null;
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
        customizationConfig: import("@prisma/client/runtime/library").JsonValue | null;
        isPublished: boolean;
        publishDate: Date | null;
        model3dUrl: string | null;
        isArable: boolean;
        licenseDocumentUrl: string | null;
        brand: string | null;
    }>;
    updateProduct(productId: string, req: FastifyRequest): Promise<({
        category: {
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
            length: import("@prisma/client/runtime/library").Decimal | null;
            description: string | null;
            updatedAt: Date;
            isDefault: boolean;
            productId: string;
            status: import(".prisma/client").$Enums.VariantStatus;
            images: string[];
            sku: string;
            price: import("@prisma/client/runtime/library").Decimal;
            mrp: import("@prisma/client/runtime/library").Decimal | null;
            stock: number;
            weightInGrams: number | null;
            hsnCode: string | null;
            sacCode: string | null;
            purchasePrice: import("@prisma/client/runtime/library").Decimal | null;
            purchasePriceType: string | null;
            tax: string | null;
            minStockCount: import("@prisma/client/runtime/library").Decimal | null;
            isMinStockAlertEnabled: boolean | null;
            dimensionUnit: string | null;
            height: import("@prisma/client/runtime/library").Decimal | null;
            width: import("@prisma/client/runtime/library").Decimal | null;
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
        customizationConfig: import("@prisma/client/runtime/library").JsonValue | null;
        isPublished: boolean;
        publishDate: Date | null;
        model3dUrl: string | null;
        isArable: boolean;
        licenseDocumentUrl: string | null;
        brand: string | null;
    }) | null>;
    private parseMultipartUpdateData;
    getDashboardStats(businessId: string, req: FastifyRequest): Promise<{
        totalStockValue: number;
        negativeStockCount: number;
        lowStockCount: number;
        outOfStockCount: number;
    }>;
    getFeaturedProductsByCategory(categoryId: string, paginationQuery: PaginationQueryDto): Promise<{
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
            length: import("@prisma/client/runtime/library").Decimal | null;
            description: string | null;
            updatedAt: Date;
            isDefault: boolean;
            productId: string;
            status: import(".prisma/client").$Enums.VariantStatus;
            images: string[];
            sku: string;
            price: import("@prisma/client/runtime/library").Decimal;
            mrp: import("@prisma/client/runtime/library").Decimal | null;
            stock: number;
            weightInGrams: number | null;
            hsnCode: string | null;
            sacCode: string | null;
            purchasePrice: import("@prisma/client/runtime/library").Decimal | null;
            purchasePriceType: string | null;
            tax: string | null;
            minStockCount: import("@prisma/client/runtime/library").Decimal | null;
            isMinStockAlertEnabled: boolean | null;
            dimensionUnit: string | null;
            height: import("@prisma/client/runtime/library").Decimal | null;
            width: import("@prisma/client/runtime/library").Decimal | null;
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
        customizationConfig: import("@prisma/client/runtime/library").JsonValue | null;
        isPublished: boolean;
        publishDate: Date | null;
        model3dUrl: string | null;
        isArable: boolean;
        licenseDocumentUrl: string | null;
        brand: string | null;
    }>;
    getCategoryPageData(slug: string, paginationQuery: PaginationQueryDto): Promise<{
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
