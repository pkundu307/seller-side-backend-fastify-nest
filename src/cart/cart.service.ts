import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  // --- UPDATED METHOD 1: Add or Update Item ---
  async addItem(customerUserId: string, dto: AddToCartDto) {
    const { productId, variantId, quantity, customizationImages, customizationDetails } = dto;

    // 1. Validate the product and variant exist
    await this.validateProduct(productId, variantId);
    if (quantity < 1) {
      throw new BadRequestException('Quantity must be at least 1.');
    }

    // 2. Check if an item with the same product/variant already exists in the cart
    const existingCartItem = await this.prisma.cartItem.findUnique({
      where: {
        customerUserId_productId_variantId: {
          customerUserId,
          productId,
          variantId: variantId || '',
        },
      },
    });

    // 3. If it exists, update the quantity. If not, create a new item.
    if (existingCartItem) {
      // Item exists, so we update its quantity
      const newQuantity = existingCartItem.quantity + quantity;
      return this.prisma.cartItem.update({
        where: { id: existingCartItem.id },
        data: {
          quantity: newQuantity,
          // You might also decide to overwrite customizations here if needed
          // customizationImages: customizationImages, 
          // customizationDetails: customizationDetails ? JSON.parse(customizationDetails) : undefined,
        },
      });
    } else {
      // Item does not exist, so we create it
      return this.prisma.cartItem.create({
        data: {
          customerUserId,
          productId,
          variantId,
          quantity,
          customizationImages, // Use the array directly
          customizationDetails: customizationDetails ? JSON.parse(customizationDetails) : undefined,
        },
      });
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
        where: { id: productId },
        select: { id: true, isCustomizable: true, variants: { where: { id: variantId } } },
      });

      if (!product) {
        throw new BadRequestException('Product not found.');
      }
      
      if (variantId && product.variants.length === 0) {
          throw new BadRequestException('Variant not found for this product.');
      }
      
      return product;
  }
}