// src/wishlist/wishlist.service.ts

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToWishlistDto } from './dto/add-to-wishlist.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  /**
   * Adds a product to the authenticated user's wishlist.
   */
  async addToWishlist(customerUserId: string, dto: AddToWishlistDto) {
    const { productId } = dto;

    const productExists = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!productExists) {
      throw new NotFoundException(`Product with ID "${productId}" not found.`);
    }

    try {
      const wishlistItem = await this.prisma.wishlist.create({
        data: {
          customerUserId,
          productId,
        },
      });
      return {
        success: true,
        message: 'Product added to wishlist successfully.',
        data: wishlistItem,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('This product is already in your wishlist.');
      }
      throw error;
    }
  }

  /**
   * Fetches all wishlist items for the authenticated user.
   */
  async getWishlist(customerUserId: string) {
    // --- THIS IS THE CORRECTED QUERY ---
    const wishlistItems = await this.prisma.wishlist.findMany({
      where: {
        customerUserId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      // Use `include` to fetch the full related objects
      include: {
        product: {
          // Then use `select` inside the include to pick the fields you need
          select: {
            id: true,
            title: true,
            slug: true,
            images: true, // Select the whole images array
            category: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
    // --- END OF CORRECTION ---


    // Now, the `map` function will work because `item.product` exists.
    return wishlistItems.map(item => ({
        wishlistItemId: item.id,
        addedAt: item.createdAt,
        product: {
            id: item.product.id,
            title: item.product.title,
            slug: item.product.slug,
            // Safely get the first image from the array
            image: item.product.images.length > 0 ? item.product.images[0] : null,
            category: item.product.category.name,
        }
    }));
  }

  /**
   * Removes an item from the authenticated user's wishlist.
   */
  async removeFromWishlist(customerUserId: string, wishlistItemId: string) {
    try {
      await this.prisma.wishlist.delete({
        where: {
          id: wishlistItemId,
          customerUserId: customerUserId,
        },
      });
      return { success: true, message: 'Item removed from wishlist successfully.' };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(
          `Wishlist item with ID "${wishlistItemId}" not found or you do not have permission to delete it.`,
        );
      }
      throw error;
    }
  }
}