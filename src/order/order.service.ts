// src/orders/orders.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
function generateOrderNumber() {
  // Format: ORD-TIMESTAMP-RANDOM (e.g., ORD-170123456-4829)
  return `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
}
@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async createCashOnDeliveryOrder(
    customerUserId: string,
    dto: CreateOrderDto,
  ) {
    // 1. Business Rule Validation
    if (dto.paymentMethod !== 'cash_on_delivery') {
      throw new BadRequestException(
        'This endpoint only supports "cash_on_delivery" orders.',
      );
    }

    if (!dto.cartItemIds || dto.cartItemIds.length === 0) {
      throw new BadRequestException('No items selected for checkout.');
    }

    // 2. Fetch ONLY the selected cart items for the user
    const cartItems = await this.prisma.cartItem.findMany({
      where: { 
        customerUserId, 
        id: { in: dto.cartItemIds } // <--- Filter by selected IDs
      },
      include: {
        variant: true, 
      },
    });

    // Validation: Did we find all the items the user asked for?
    // If cartItems.length < dto.cartItemIds.length, it means some IDs were invalid 
    // or belonged to a different user.
    if (cartItems.length !== new Set(dto.cartItemIds).size) {
      throw new BadRequestException(
        'One or more selected items are invalid or do not exist in your cart.',
      );
    }

    if (cartItems.length === 0) {
      throw new BadRequestException('Cannot place an order with no valid items.');
    }

    // 3. Calculate the total amount
    let totalAmount = new Decimal(0);
    for (const item of cartItems) {
      if (!item.variant) {
        throw new NotFoundException(
          `Product variant with ID ${item.variantId} not found for item ${item.id}.`,
        );
      }
      const itemTotal = new Decimal(item.variant.price).times(item.quantity);
      totalAmount = totalAmount.plus(itemTotal);
    }
    
    if(dto.shippingFee) totalAmount = totalAmount.plus(dto.shippingFee);
    if(dto.taxAmount) totalAmount = totalAmount.plus(dto.taxAmount);
    if(dto.discount) totalAmount = totalAmount.minus(dto.discount);


    // 4. Transaction
    return this.prisma.$transaction(async (tx) => {
      // Step A: Create Order
      const newOrder = await tx.order.create({
        data: {
          customerUserId,
          totalAmount,
          selectedAddress: dto.selectedAddress,
          paymentMethod: 'cash_on_delivery',
          paymentStatus: PaymentStatus.pending,
          status: OrderStatus.pending,
          shippingFee: dto.shippingFee || 0,
          taxAmount: dto.taxAmount || 0,
          discount: dto.discount || 0,
                orderNumber: generateOrderNumber(), 

        },
      });

      // Step B: Prepare Order Items
      const orderItemsData = cartItems.map((item) => ({
        orderId: newOrder.id,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        // Assuming variant.price is valid because of the check above
        priceAtTimeOfOrder: item.variant!.price, 
        customizationImages: item.customizationImages,
        customizationDetails: item.customizationDetails ?? undefined,
      }));

      // Step C: Create Order Items
      await tx.orderItem.createMany({
        data: orderItemsData,
      });

      // Step D: Delete ONLY the selected items from the cart
      await tx.cartItem.deleteMany({
        where: { 
          customerUserId, // Security check
          id: { in: dto.cartItemIds } // <--- Only delete selected
        },
      });

      // Step E: Return result
      return tx.order.findUnique({
        where: { id: newOrder.id },
        include: {
          items: true,
        },
      });
    });
  }
}