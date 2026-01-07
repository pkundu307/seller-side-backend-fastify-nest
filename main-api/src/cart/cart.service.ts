import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { S3Service } from 'src/products/utils/s3Service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { Prisma, Product } from '@prisma/client';

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  /** -------------------------------
   * 🛒 Add an item to the cart
   * ------------------------------- */
  // async addItem(
  //   customerUserId: string,
  //   dto: AddToCartDto,
  //   customizationFiles: Array<{ buffer: Buffer; filename: string; mimetype: string }>,
  // ) {
  //   const { productId, variantId, quantity, customizationDetails } = dto;
  //   const uploadedImageUrls: string[] = [];

  //   if (quantity < 1) throw new BadRequestException('Quantity must be at least 1.');

  //   // ✅ Validate product & variant existence
  //   await this.validateProduct(productId, variantId);

  //   // ✅ Upload images (if any)
  //   if (customizationFiles?.length) {
  //     for (const file of customizationFiles) {
  //       const imageUrl = await this.s3Service.uploadImage(
  //         file.buffer,
  //         file.filename,
  //         file.mimetype,
  //       );
  //       uploadedImageUrls.push(imageUrl);
  //     }
  //   }

  //   // ✅ Unique constraint check
  //   const uniqueKey = {
  //     customerUserId,
  //     productId,
  //     variantId: variantId || null,
  //   };

  //   const existingCartItem = await this.prisma.cartItem.findFirst({
  //     where: uniqueKey,
  //   });

  //   const parsedDetails = customizationDetails
  //     ? JSON.parse(customizationDetails)
  //     : Prisma.JsonNull;

  //   if (existingCartItem) {
  //     // Update existing
  //     return this.prisma.cartItem.update({
  //       where: { id: existingCartItem.id },
  //       data: {
  //         quantity: existingCartItem.quantity + quantity,
  //         customizationImages: uploadedImageUrls,
  //         customizationDetails: parsedDetails,
  //       },
  //     });
  //   }

  //   // Create new
  //   return this.prisma.cartItem.create({
  //     data: {
  //       customerUserId,
  //       productId,
  //       variantId,
  //       quantity,
  //       customizationImages: uploadedImageUrls,
  //       customizationDetails: parsedDetails,
  //     },
  //   });
  // }

  /** -------------------------------
   * 📦 Get all cart items for user
   * ------------------------------- */
  async getCartItems(customerUserId: string) {
    return this.prisma.cartItem.findMany({
      where: { customerUserId },
      include: {
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
                images: true,
              },
            },
          },
        },
      },
    });
  }

   async deleteCartItem(customerUserId: string, cartItemId: string) {
    // First, find the item to ensure it exists and belongs to the user.
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
    });

    // If it doesn't exist or doesn't belong to the requesting user, throw an error.
    if (!cartItem || cartItem.customerUserId !== customerUserId) {
      throw new NotFoundException('Cart item not found or unauthorized.');
    }

    // If the check passes, delete the item.
    return this.prisma.cartItem.delete({
      where: { id: cartItemId },
    });
  }

  /** -------------------------------
   * ✏️ Update cart item by ID
   * ------------------------------- */
  async updateCartItem(
    customerUserId: string,
    cartItemId: string,
    dto: UpdateCartItemDto,
  ) {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
    });

    if (!cartItem || cartItem.customerUserId !== customerUserId) {
      throw new NotFoundException('Cart item not found or unauthorized.');
    }

    const updateData: Prisma.CartItemUpdateInput = {};

    if (dto.quantity !== undefined) {
      if (dto.quantity < 1)
        throw new BadRequestException('Quantity cannot be less than 1.');
      updateData.quantity = dto.quantity;
    }

    if (dto.customizationImages !== undefined)
      updateData.customizationImages = dto.customizationImages;

    if (dto.customizationDetails !== undefined) {
      try {
        updateData.customizationDetails = dto.customizationDetails
          ? JSON.parse(dto.customizationDetails)
          : Prisma.JsonNull;
      } catch {
        throw new BadRequestException('Invalid JSON in customizationDetails.');
      }
    }

    if (Object.keys(updateData).length === 0)
      throw new BadRequestException('No valid update fields provided.');

    return this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: updateData,
    });
  }

  /** -------------------------------
   * 🧩 Validate product and variant
   * ------------------------------- */
 private async validateProduct(productId: string, variantId?: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({
      where: { 
        id: productId,
        isPublished: true // Good practice to only allow adding published products
      },
      include: {
        variants: variantId ? { where: { id: variantId } } : false,
      },
    });

    // Check 1: Product exists and is published
    if (!product) {
      throw new NotFoundException(`Product with ID "${productId}" was not found or is not available.`);
    }

    // Check 2: If a variantId was provided, ensure it's a valid variant of this product
    if (variantId && (!product.variants || product.variants.length === 0)) {
      throw new NotFoundException(`Variant with ID "${variantId}" does not exist for this product.`);
    }
    
    return product; // Return the full product object on success
}


/**
 * REWRITTEN: This method now handles customizable and non-customizable products differently.
 */
async addItem(
    customerUserId: string,
    dto: AddToCartDto,
    customizationFiles: Array<{ buffer: Buffer; filename: string; mimetype: string }>,
) {
    const { productId, variantId, quantity, customizationDetails } = dto;
    
    if (quantity < 1) throw new BadRequestException('Quantity must be at least 1.');

    // Step 1: Validate the product and get its properties (like isCustomizable)
    const product = await this.validateProduct(productId, variantId);

    // Step 2: Upload any customization images to S3
    const uploadedImageUrls: string[] = [];
    if (customizationFiles?.length) {
      for (const file of customizationFiles) {
        const imageUrl = await this.s3Service.uploadImage(
          file.buffer,
          file.filename,
          file.mimetype,
          "cart"
        );
        uploadedImageUrls.push(imageUrl);
      }
    }

    // Step 3: Prepare the data for the cart item
    const parsedDetails = customizationDetails
      ? JSON.parse(customizationDetails)
      : Prisma.JsonNull;

    // --- CORE LOGIC BRANCH ---
    if (product.isCustomizable && (uploadedImageUrls.length > 0 || customizationDetails)) {
        // For customizable products, ALWAYS create a new cart item entry.
        // Each customization is treated as a unique item.
        console.log(`Product is customizable. Creating new cart entry for product ${productId}.`);
        
        return this.prisma.cartItem.create({
          data: {
            customerUserId,
            productId,
            variantId,
            quantity, // Typically quantity is 1 for custom items, but we'll respect the DTO
            customizationImages: uploadedImageUrls,
            customizationDetails: parsedDetails,
          },
        });

    } else {
        // For standard, non-customizable products, use the original "find or create/update" logic.
        console.log(`Product is not customizable. Checking for existing cart item for product ${productId}.`);
        
        const existingCartItem = await this.prisma.cartItem.findFirst({
          where: {
            customerUserId,
            productId,
            variantId: variantId || null,
          },
        });
        console.log(`Existing cart item: ${existingCartItem ? 'Found' : 'Not found'}`);
        

        if (existingCartItem) {
          // If it exists, just update the quantity.
          return this.prisma.cartItem.update({
            where: { id: existingCartItem.id },
            data: {
              quantity: existingCartItem.quantity + quantity,
            },
          });
        } else {
          // If it doesn't exist, create a new one.
          return this.prisma.cartItem.create({
            data: {
              customerUserId,
              productId,
              variantId,
              quantity,
              // Standard products might not have these, but we include them in case
              customizationImages: uploadedImageUrls,
              customizationDetails: parsedDetails,
            },
          });
        }
    }
}
}
