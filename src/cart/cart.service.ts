import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { S3Service } from 'src/products/utils/s3Service';

// src/cart/cart.service.ts
// import { S3Service } from '../s3/s3.service'; // Adjust path as needed
import { Prisma } from '@prisma/client'; // Import Prisma for error handling

// ... other imports

export class CartService {
  // Inject S3Service
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

   async addItem(
    customerUserId: string,
    dto: AddToCartDto,
    customizationFiles: any[], // <-- We now accept raw file data
  ) {
    const { productId, variantId, quantity, customizationDetails } = dto;
    const uploadedImageUrls: string[] = [];

    try {
      // 1. Validate the product and variant exist
      await this.validateProduct(productId, variantId);
      if (quantity < 1) {
        throw new BadRequestException('Quantity must be at least 1.');
      }

      // 2. Upload customization images if any are provided
      if (customizationFiles && customizationFiles.length > 0) {
        for (const file of customizationFiles) {
          const imageUrl = await this.s3Service.uploadImage(
            file.buffer,
            file.filename,
            file.mimetype,
          );
          uploadedImageUrls.push(imageUrl);
        }
      }

      // 3. Find the unique identifier for the cart item
      // Using `variantId: variantId || null` is safer for Prisma's unique constraint
      const uniqueIdentifier = {
        customerUserId,
        productId,
        variantId: variantId || null,
      };

      const existingCartItem = await this.prisma.cartItem.findFirst({
        where: uniqueIdentifier,
      });

      // 4. If it exists, update. If not, create.
      if (existingCartItem) {
        const newQuantity = existingCartItem.quantity + quantity;
        return this.prisma.cartItem.update({
          where: { id: existingCartItem.id },
          data: {
            quantity: newQuantity,
            // Overwrite images and details with the new upload
            customizationImages: uploadedImageUrls,
            customizationDetails: customizationDetails
              ? JSON.parse(customizationDetails)
              : Prisma.JsonNull,
          },
        });
      } else {
        return this.prisma.cartItem.create({
          data: {
            customerUserId,
            productId,
            variantId,
            quantity,
            // Use the URLs from the new upload
            customizationImages: uploadedImageUrls,
            customizationDetails: customizationDetails
              ? JSON.parse(customizationDetails)
              : undefined,
          },
        });
      }
    } catch (error) {
      // Rollback: If something fails after upload, delete the orphaned S3 files
      if (uploadedImageUrls.length > 0) {
        console.error(
          'An error occurred during cart item creation. Rolling back S3 uploads...',
        );
        // Assuming you have a method to delete files from S3
        // await this.s3Service.deleteImages(uploadedImageUrls);
      }
      // Re-throw the original error
      throw error;
    }
  }
  
  async getCartItems(customerUserId: string) {
    return this.prisma.cartItem.findMany({
      where: { customerUserId },
      include: {
        // This include structure is good and will work correctly
        variant: {
          select: {
            id: true,
            price: true,
            images: true,
            attributeValues: {
              include: {
                attribute: true,
                attributeOption: true,
              },
            },
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
                images: true
              }
            }
          }
        },
      },
    });
  }

  // --- UPDATED METHOD 2: Update Cart Item by ID ---
  async updateCartItem(customerUserId: string, cartItemId: string, dto: UpdateCartItemDto) {
    // 1. Find the cart item and verify ownership
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
    });

    if (!cartItem || cartItem.customerUserId !== customerUserId) {
      throw new NotFoundException(`Cart item not found or you do not have permission.`);
    }

    // 2. Prepare update data from DTO
    const { quantity, customizationImages, customizationDetails } = dto;
    const updateData: {
      quantity?: number;
      customizationImages?: string[];
      customizationDetails?: any;
    } = {};

    if (quantity !== undefined) {
      if (quantity < 1) throw new BadRequestException('Quantity cannot be less than 1.');
      updateData.quantity = quantity;
    }
    
    // CHANGED: Handle the customizationImages array
    if (customizationImages !== undefined) {
      updateData.customizationImages = customizationImages;
    }
    
    if (customizationDetails !== undefined) {
      updateData.customizationDetails = customizationDetails ? JSON.parse(customizationDetails) : null;
    }

    // 3. Execute update if there's data to update
    if (Object.keys(updateData).length === 0) {
        throw new BadRequestException('No update data provided.');
    }

    return this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: updateData,
    });
  }

  // Helper to ensure product/variant IDs are valid (unchanged)
  private async validateProduct(productId: string, variantId?: string) {
      const product = await this.prisma.product.findUnique({
        where: { 
        id: productId,
        isPublished: true // It's good practice to ensure the product is actually available
      },
      include: {
        // Only include variants if a variantId was passed
        variants: variantId ? { where: { id: variantId } } : false,
      },
    });
      if (!product) {
        throw new BadRequestException('Product not found.');
      }
      
       if (variantId && (!product.variants || product.variants.length === 0)) {
      throw new NotFoundException(`Variant with ID "${variantId}" does not exist for this product.`);
    }
      
      return product;
  }
}