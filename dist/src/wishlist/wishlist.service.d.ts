import { PrismaService } from '../prisma/prisma.service';
import { AddToWishlistDto } from './dto/add-to-wishlist.dto';
export declare class WishlistService {
    private prisma;
    constructor(prisma: PrismaService);
    addToWishlist(customerUserId: string, dto: AddToWishlistDto): Promise<{
        success: boolean;
        message: string;
        data: {
            id: string;
            createdAt: Date;
            customerUserId: string;
            productId: string;
        };
    }>;
    getWishlist(customerUserId: string): Promise<{
        wishlistItemId: string;
        addedAt: Date;
        product: {
            id: string;
            title: string;
            slug: string;
            image: string | null;
            category: string;
        };
    }[]>;
    removeFromWishlist(customerUserId: string, wishlistItemId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
