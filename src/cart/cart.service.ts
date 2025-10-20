import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

async addItem(customerUserId: string, dto: AddToCartDto) {
  const { productId, variantId, quantity, customizationImage, customizationDetails } = dto;

  const product = await this.validateProduct(productId, variantId);
  if (!product) throw new BadRequestException('Product not found.');

  if (quantity < 1) throw new BadRequestException('Quantity must be at least 1.');

  const normalizedDetails = customizationDetails ? JSON.stringify(JSON.parse(customizationDetails)) : null;

  const existingCartItem = await this.prisma.cartItem.findMany({
    where: {
      customerUserId,
      productId,
      variantId: variantId || null,
      customizationImage,
      customizationDetails: normalizedDetails ? { equals: JSON.parse(normalizedDetails) } : undefined,
    },
  });
console.log(existingCartItem);

  if (existingCartItem.length > 0) {
    throw new BadRequestException('Item already exists in the cart.');
  }

  return this.prisma.cartItem.create({
    data: {
      customerUserId,
      productId,
      variantId,
      quantity,
      customizationImage,
      customizationDetails: normalizedDetails ? JSON.parse(normalizedDetails) : undefined,
    },
  });
}

  
  // Helper to ensure IDs are valid
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
      
      // If customizable, ensure customization details are provided if they are required (optional complex logic)
      if (product.isCustomizable) {
          // You might add logic here to check if customizationImage/Details are required
      }
      
      return product;
  }
   async getCartItems(customerUserId: string) {
    return this.prisma.cartItem.findMany({
      where: {
        customerUserId: customerUserId,
      },
      // Include product and variant details for the frontend display
      include: {
        customerUser: false, // Don't expose customer details here
        variant: {
          select: {
            id: true,
            sku: true,
            price: true,
            images: true,
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
              }
            }
          }
        },
        // We link directly to product, but often prefer variant linkage for price accuracy
        // product: { select: { id: true, title: true, images: true } } 
      }
    });
  }

  // --- NEW METHOD 2: Update Cart Item by ID ---
  async updateCartItem(
    customerUserId: string,
    cartItemId: string,
    dto: UpdateCartItemDto,
  ) {
    // 1. Find the cart item and verify ownership
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
    });

    if (!cartItem) {
      throw new NotFoundException(`Cart item with ID "${cartItemId}" not found.`);
    }

    if (cartItem.customerUserId !== customerUserId) {
      throw new BadRequestException('You do not have permission to modify this cart item.');
    }

    // 2. Prepare update data
    const updateData: any = {};

    if (dto.quantity !== undefined) {
      updateData.quantity = dto.quantity;
    }
    if (dto.customizationImage !== undefined) {
      updateData.customizationImage = dto.customizationImage;
    }
    
    // Handle the JSON string conversion
    if (dto.customizationDetails !== undefined) {
      updateData.customizationDetails = dto.customizationDetails 
        ? JSON.parse(dto.customizationDetails) 
        : null; // Allows clearing the customization details
    }

    // 3. Execute update
    return this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: updateData,
      // You might want to return the full item with product details here too
    });
  }
}