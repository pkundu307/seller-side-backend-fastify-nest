// src/cart/cart.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { S3Service } from 'src/products/utils/s3Service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { Prisma } from '@prisma/client';
import { getStateCode } from 'src/utils/state-codes'; // ✅ Import the utility helper
import { restOfIndiaRate } from 'src/payment/utils/xpressbees-calculator';

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  /** ---------------------------------------------------------
   * 📦 Fetch Cart Items
   * --------------------------------------------------------- */
// src/cart/cart.service.ts

async getCartItems(customerUserId: string) {
  const items = await this.prisma.cartItem.findMany({
    where: { customerUserId },
    include: {
      variant: {
        include: {
          product: {
            include: {
              business: {
                select: {
                  id: true,
                  name: true,
                  state: true,
                  stateCode: true,
                },
              },
            },
          },
          attributeValues: {
            include: {
              attribute: true,
              attributeOption: true,
            },
          },
        },
      },
    },
    orderBy: { id: 'desc' },
  });

  // ── Shipping Manipulation ──────────────────────────────
  return items.map((item) => {
    const variant = item.variant;
    if (!variant) return item;

    const basePrice = Number(variant.price);
    const baseMrp   = Number(variant.mrp);

    if (basePrice <= 399) {
      return {
        ...item,
        variant: {
          ...variant,
          shippingIncluded:     false,
          shippingCharge:       0,
          freeShippingEligible: false,
        },
      };
    }

    const actualG = Number(variant.weightInGrams ?? 500);
    const l       = parseFloat(variant.length?.toString() ?? '0');
    const w       = parseFloat(variant.width?.toString()  ?? '0');
    const h       = parseFloat(variant.height?.toString() ?? '0');

    const volG        = (l > 0 && w > 0 && h > 0) ? (l * w * h) / 5 : 0;
    const chargeableG = Math.ceil(Math.max(actualG, volG) / 500) * 500;
    const shippingCharge = restOfIndiaRate(chargeableG);

    return {
      ...item,
      variant: {
        ...variant,
        price:                String(basePrice + shippingCharge),
        mrp:                  String(baseMrp   + shippingCharge),
        shippingIncluded:     true,
        shippingCharge,
        freeShippingEligible: true,
      },
    };
  });
  // ──────────────────────────────────────────────────────
}

  /** ---------------------------------------------------------
   * ➕ Add Item to Cart
   * --------------------------------------------------------- */
  async addItem(
    customerUserId: string,
    dto: AddToCartDto,
    customizationFiles: Array<{
      buffer: Buffer;
      filename: string;
      mimetype: string;
    }>,
  ) {
    const { productId, variantId, quantity, customizationDetails } = dto;

    if (quantity < 1) throw new BadRequestException('Quantity must be at least 1.');

    // 1. Validate Product/Variant & Get Seller Location
    const product = await this.prisma.product.findUnique({
      where: { id: productId, isPublished: true },
      include: {
        business: { select: { state: true, stateCode: true } },
        variants: variantId ? { where: { id: variantId } } : false,
      },
    });

    if (!product) throw new NotFoundException('Product not found or unavailable.');
    if (variantId && (!product.variants || product.variants.length === 0)) {
      throw new NotFoundException('Selected variant is invalid.');
    }

    // 2. Resolve Supply State & Code (Origin)
    // We treat everything in lowercase/small letters for reliability
    const rawState = product.business?.state ?? null;
    
    // Logic: Use existing stateCode if available, otherwise resolve via Small Letters Map
    const supplyStateCode = 
      product.business?.stateCode || 
      (rawState ? getStateCode(rawState) : null); // ✅ Standardizes to small letters automatically

    // 3. Handle Customization Files
    const uploadedImageUrls: string[] = [];
    if (customizationFiles?.length) {
      for (const file of customizationFiles) {
        const url = await this.s3Service.uploadImage(file.buffer, file.filename, file.mimetype, 'cart');
        uploadedImageUrls.push(url);
      }
    }

    // 4. Parse Text Details
    let parsedDetails = Prisma.JsonNull;
    if (customizationDetails) {
      try {
        parsedDetails = JSON.parse(customizationDetails);
      } catch (e) {
        throw new BadRequestException('Invalid JSON for customization details.');
      }
    }

    // 5. Merge logic for standard items
    const isCustomized = (uploadedImageUrls.length > 0 || customizationDetails);

    if (!isCustomized) {
      const existingItem = await this.prisma.cartItem.findFirst({
        where: {
          customerUserId,
          productId,
          variantId: variantId || null,
          customizationImages: { equals: [] },
        },
      });

      if (existingItem) {
        return this.prisma.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + quantity,
            supplyState: rawState,
            supplyStateCode, // Update with standard code
          },
        });
      }
    }

    // 6. Create New Cart Item
    return this.prisma.cartItem.create({
      data: {
        customerUserId,
        productId,
        variantId: variantId || null,
        quantity,
        customizationImages: uploadedImageUrls,
        customizationDetails: parsedDetails,
        supplyState: rawState,
        supplyStateCode,
      },
    });
  }

  /** ---------------------------------------------------------
   * ✏️ Update Cart Item
   * --------------------------------------------------------- */
  async updateCartItem(
    customerUserId: string,
    cartItemId: string,
    dto: UpdateCartItemDto,
  ) {
    const item = await this.prisma.cartItem.findUnique({ where: { id: cartItemId } });

    if (!item || item.customerUserId !== customerUserId) {
      throw new NotFoundException('Cart item not found.');
    }

    const updateData: Prisma.CartItemUpdateInput = {};

    if (dto.quantity !== undefined) {
      if (dto.quantity < 1) throw new BadRequestException('Min quantity 1 required.');
      updateData.quantity = dto.quantity;
    }

    if (dto.customizationDetails) {
      try {
        updateData.customizationDetails = JSON.parse(dto.customizationDetails);
      } catch {
        throw new BadRequestException('Invalid JSON provided.');
      }
    }

    return this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: updateData,
    });
  }

  /** ---------------------------------------------------------
   * 🗑️ Delete Cart Item
   * --------------------------------------------------------- */
  async deleteCartItem(customerUserId: string, cartItemId: string) {
    const item = await this.prisma.cartItem.findUnique({ where: { id: cartItemId } });

    if (!item || item.customerUserId !== customerUserId) {
      throw new NotFoundException('Cart item not found.');
    }

    return this.prisma.cartItem.delete({ where: { id: cartItemId } });
  }
}