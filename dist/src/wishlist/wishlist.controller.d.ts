import { WishlistService } from './wishlist.service';
import { AddToWishlistDto } from './dto/add-to-wishlist.dto';
import { UserRequest } from '../auth/auth.types';
export declare class WishlistController {
    private readonly wishlistService;
    constructor(wishlistService: WishlistService);
    addToWishlist(req: UserRequest, addToWishlistDto: AddToWishlistDto): Promise<{
        success: boolean;
        message: string;
        data: {
            id: string;
            createdAt: Date;
            customerUserId: string;
            productId: string;
        };
    }>;
    getWishlist(req: UserRequest): Promise<{
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
    removeFromWishlist(req: UserRequest, wishlistItemId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
