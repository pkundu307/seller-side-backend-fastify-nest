import { PrismaService } from 'src/prisma/prisma.service';
import { S3Service } from 'src/products/utils/s3Service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { Prisma } from '@prisma/client';
export declare class CartService {
    private readonly prisma;
    private readonly s3Service;
    constructor(prisma: PrismaService, s3Service: S3Service);
    getCartItems(customerUserId: string): Promise<({
        variant: {
            id: string;
            product: {
                id: string;
                title: string;
                slug: string;
                images: string[];
            };
            images: string[];
            price: Prisma.Decimal;
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
        } | null;
    } & {
        id: string;
        variantId: string | null;
        customerUserId: string;
        quantity: number;
        productId: string;
        customizationDetails: Prisma.JsonValue | null;
        customizationImages: string[];
    })[]>;
    deleteCartItem(customerUserId: string, cartItemId: string): Promise<{
        id: string;
        variantId: string | null;
        customerUserId: string;
        quantity: number;
        productId: string;
        customizationDetails: Prisma.JsonValue | null;
        customizationImages: string[];
    }>;
    updateCartItem(customerUserId: string, cartItemId: string, dto: UpdateCartItemDto): Promise<{
        id: string;
        variantId: string | null;
        customerUserId: string;
        quantity: number;
        productId: string;
        customizationDetails: Prisma.JsonValue | null;
        customizationImages: string[];
    }>;
    private validateProduct;
    addItem(customerUserId: string, dto: AddToCartDto, customizationFiles: Array<{
        buffer: Buffer;
        filename: string;
        mimetype: string;
    }>): Promise<{
        id: string;
        variantId: string | null;
        customerUserId: string;
        quantity: number;
        productId: string;
        customizationDetails: Prisma.JsonValue | null;
        customizationImages: string[];
    }>;
}
