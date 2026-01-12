import { FastifyRequest } from 'fastify';
import { CartService } from './cart.service';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { UserRequest } from 'src/auth/auth.types';
export declare class CartController {
    private readonly cartService;
    constructor(cartService: CartService);
    testMultipart(req: FastifyRequest): Promise<{
        message: string;
        bodyKeys: string[];
    }>;
    addItemToCart(req: UserRequest): Promise<{
        id: string;
        variantId: string | null;
        customerUserId: string;
        quantity: number;
        productId: string;
        customizationDetails: import("@prisma/client/runtime/library").JsonValue | null;
        customizationImages: string[];
    }>;
    getCart(req: UserRequest): Promise<({
        variant: {
            id: string;
            product: {
                id: string;
                title: string;
                slug: string;
                images: string[];
            };
            images: string[];
            price: import("@prisma/client/runtime/library").Decimal;
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
        customizationDetails: import("@prisma/client/runtime/library").JsonValue | null;
        customizationImages: string[];
    })[]>;
    updateCartItem(cartItemId: string, dto: UpdateCartItemDto, req: UserRequest): Promise<{
        id: string;
        variantId: string | null;
        customerUserId: string;
        quantity: number;
        productId: string;
        customizationDetails: import("@prisma/client/runtime/library").JsonValue | null;
        customizationImages: string[];
    }>;
    private parseMultipartData;
    deleteCartItem(cartItemId: string, req: UserRequest): Promise<{
        id: string;
        variantId: string | null;
        customerUserId: string;
        quantity: number;
        productId: string;
        customizationDetails: import("@prisma/client/runtime/library").JsonValue | null;
        customizationImages: string[];
    }>;
}
