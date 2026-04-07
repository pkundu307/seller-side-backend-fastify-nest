import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, PaymentStatus, NotificationType, PlatformChargeType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { CancelOrderDto } from './dto/cancel-order.dto';

function generateOrderNumber() {
  return `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

// src/orders/orders.service.ts — createCashOnDeliveryOrder()


async createCashOnDeliveryOrder(customerUserId: string, dto: CreateOrderDto) {
  if (dto.paymentMethod !== 'cash_on_delivery') {
    throw new BadRequestException('This endpoint only supports "cash_on_delivery" orders.');
  }
  if (!dto.cartItemIds || dto.cartItemIds.length === 0) {
    throw new BadRequestException('No items selected for checkout.');
  }

  // 1. Fetch & validate cart items
  const cartItems = await this.prisma.cartItem.findMany({
    where: { customerUserId, id: { in: dto.cartItemIds } },
    include: {
      variant: {
        include: {
          product: {
            include: { business: true },
          },
        },
      },
    },
  });

  if (cartItems.length !== new Set(dto.cartItemIds).size) {
    throw new BadRequestException('One or more selected items are invalid.');
  }

  // 2. Collect involved businesses
  const involvedBusinessIds = new Set<string>();
  for (const item of cartItems) {
    if (!item.variant) {
      throw new NotFoundException(`Variant missing for cart item ${item.id}`);
    }
    if (item.variant.product.businessId) {
      involvedBusinessIds.add(item.variant.product.businessId);
    }
  }

  // 3. Build total from frontend-sent values (manipulated prices already baked in)
  //    dto.discount = couponDiscount + bakedShippingDiscount combined
  const shippingFee  = new Decimal(dto.shippingFee  ?? 0);
  const platformFee  = new Decimal(dto.platformFee  ?? 0);
  const taxAmount    = new Decimal(dto.taxAmount    ?? 0);
  const codFee       = new Decimal(dto.codFee       ?? 30);
  const discount     = new Decimal(dto.discount     ?? 0); // combined discount
  const packagingFee = new Decimal(8.5);                   // match frontend constant

  // Subtotal from DB raw prices (for record keeping only)
  let dbSubtotal = new Decimal(0);
  for (const item of cartItems) {
    dbSubtotal = dbSubtotal.plus(
      new Decimal(item.variant!.price).times(item.quantity),
    );
  }

  // Frontend-equivalent total calculation
  let totalAmount = dbSubtotal
    .plus(shippingFee)
    .plus(codFee)
    .plus(packagingFee)
    .plus(platformFee)
    .plus(taxAmount)
    .minus(discount); // ← single combined discount

  if (totalAmount.lessThan(0)) totalAmount = new Decimal(0);

  const orderNum          = generateOrderNumber();
  const businessIdsArray  = Array.from(involvedBusinessIds);
  const primaryBusinessId = businessIdsArray[0] ?? null;

  // 4. Run everything in a transaction
  const newOrder = await this.prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        customerUserId,
        totalAmount,
        selectedAddress: dto.selectedAddress ?? {},
        paymentMethod:   'cash_on_delivery',
        paymentStatus:   PaymentStatus.pending,
        status:          OrderStatus.pending,
        shippingFee:     shippingFee,
        taxAmount:       taxAmount,
        discount:        discount,   // store combined discount
        orderNumber:     orderNum,
        couponCode:      dto.couponCode     ?? null,
        couponDiscount:  dto.couponDiscount ?? null, // store coupon-only for display
      },
    });

    if (platformFee.greaterThan(0) && primaryBusinessId) {
      await tx.platformCharge.create({
        data: {
          orderId:              order.id,
          businessId:           primaryBusinessId,
          chargeType:           PlatformChargeType.COMMISSION,
          description:          'Platform commission on COD order',
          amount:               platformFee,
          currency:             'INR',
          isDeductedFromSeller: false,
          isRefundable:         false,
        },
      });
    }

    if (primaryBusinessId) {
      await tx.platformCharge.create({
        data: {
          orderId:              order.id,
          businessId:           primaryBusinessId,
          chargeType:           PlatformChargeType.ADJUSTMENT,
          description:          `COD handling fee ₹${codFee.toFixed(2)}`,
          amount:               codFee,
          currency:             'INR',
          isDeductedFromSeller: false,
          isRefundable:         false,
        },
      });
    }

    if (dto.couponCode && dto.couponDiscount) {
      const coupon = await tx.coupon.findUnique({
        where: { code: dto.couponCode },
      });
      if (coupon) {
        await tx.couponUsage.create({
          data: {
            couponId:        coupon.id,
            customerUserId,
            orderId:         order.id,
            discountApplied: dto.couponDiscount,
          },
        });
        await tx.coupon.update({
          where: { id: coupon.id },
          data:  { usedCount: { increment: 1 } },
        });
      }
    }

    await tx.orderItem.createMany({
      data: cartItems.map((item) => ({
        orderId:              order.id,
        productId:            item.productId,
        variantId:            item.variantId,
        quantity:             item.quantity,
        priceAtTimeOfOrder:   item.variant!.price, // raw DB price for records
        customizationImages:  item.customizationImages,
        customizationDetails: item.customizationDetails ?? undefined,
      })),
    });

    await tx.cartItem.deleteMany({
      where: { customerUserId, id: { in: dto.cartItemIds } },
    });

    await tx.customerNotification.create({
      data: {
        customerUserId,
        title:    'Order Placed',
        message:  `Your order ${orderNum} has been placed for ₹${totalAmount.toFixed(2)} (incl. ₹${codFee.toFixed(2)} COD fee).`,
        type:     NotificationType.ORDER,
        metadata: { orderId: order.id, orderNumber: orderNum },
      },
    });

    if (businessIdsArray.length > 0) {
      const sellers = await tx.user.findMany({
        where:  { businesses: { some: { id: { in: businessIdsArray } } } },
        select: { id: true },
      });
      for (const seller of sellers) {
        await tx.sellerNotification.create({
          data: {
            userId:   seller.id,
            title:    'New COD Order',
            message:  `New COD order ${orderNum} received.`,
            type:     NotificationType.ORDER,
            metadata: { orderId: order.id },
          },
        });
      }
    }

    return order;
  });

  const fullOrder = await this.prisma.order.findUnique({
    where:   { id: newOrder.id },
    include: {
      items: {
        include: {
          variant: { include: { product: true } },
        },
      },
    },
  });

  return {
    id:              newOrder.id,
    orderNumber:     newOrder.orderNumber,
    createdAt:       newOrder.createdAt.toISOString(),
    totalAmount:     newOrder.totalAmount.toFixed(2),
    selectedAddress: newOrder.selectedAddress,
    couponCode:      newOrder.couponCode     ?? null,
    couponDiscount:  newOrder.couponDiscount
                       ? Number(newOrder.couponDiscount)
                       : null,
    items: (fullOrder?.items ?? []).map((item) => ({
      productName: item.variant?.product?.title       ?? 'Product',
      imageUrl:    item.variant?.product?.images?.[0] ?? '',
      quantity:    item.quantity,
      price:       item.priceAtTimeOfOrder.toFixed(2),
    })),
  };
}

  // API for Success Page
  async getOrderSuccessDetails(customerUserId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: { title: true, images: true, slug: true },
                },
              },
            },
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Order not found.');
    if (order.customerUserId !== customerUserId) throw new ForbiddenException('Access denied.');

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      deliveryAddress: order.selectedAddress,
      estimatedDeliveryDate: order.estimatedDeliveryDate,
      // ─── COUPON ───
      couponCode: order.couponCode ?? null,
      couponDiscount: order.couponDiscount ?? null,
      items: order.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        price: item.priceAtTimeOfOrder,
        productName: item.variant?.product.title || 'Product Unavailable',
        productImage: item.variant?.product.images?.[0] || '',
      })),
    };
  }

  async findAllByCustomer(customerUserId: string) {
    const orders = await this.prisma.order.findMany({
      where: { customerUserId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        totalAmount: true,
        createdAt: true,
        estimatedDeliveryDate: true,
        selectedAddress: true,
        // ─── COUPON ───
        couponCode: true,
        couponDiscount: true,
        items: {
          select: {
            id: true,
            quantity: true,
            priceAtTimeOfOrder: true,
            variant: {
              select: {
                sku: true,
                product: {
                  select: { title: true, images: true, slug: true },
                },
              },
            },
          },
        },
      },
    });

    return orders.map((order) => ({
      ...order,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      items: order.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        price: item.priceAtTimeOfOrder,
        productName: item.variant?.product?.title || 'Product Unavailable',
        productImage: item.variant?.product?.images?.[0] || null,
        productSlug: item.variant?.product?.slug || null,
        variantSku: item.variant?.sku || 'N/A',
      })),
    }));
  }

  async findOneByCustomer(customerUserId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    title: true,
                    images: true,
                    slug: true,
                    business: { select: { name: true, id: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Order not found.');
    if (order.customerUserId !== customerUserId) {
      throw new ForbiddenException('You are not authorized to view this order.');
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,

      // Financials
      totalAmount: order.totalAmount,
      subtotal: order.totalAmount
        .minus(order.shippingFee)
        .minus(order.taxAmount)
        .plus(order.discount),
      shippingFee: order.shippingFee,
      taxAmount: order.taxAmount,
      discount: order.discount,
      // ─── COUPON ───
      couponCode: order.couponCode ?? null,
      couponDiscount: order.couponDiscount ?? null,

      // Logistics
      selectedAddress: order.selectedAddress,
      estimatedDeliveryDate: order.estimatedDeliveryDate,
      trackingNumber: order.trackingNumber,

      items: order.items.map((item) => {
        const product = item.variant?.product;
        const business = product?.business;
        return {
          id: item.id,
          quantity: item.quantity,
          price: item.priceAtTimeOfOrder,
          total: new Decimal(item.priceAtTimeOfOrder).times(item.quantity),
          productName: product?.title || 'Product Unavailable',
          productId: product?.id,
          productSlug: product?.slug,
          productImage: product?.images?.[0] || null,
          variantSku: item.variant?.sku,
          customizationDetails: item.customizationDetails,
          customizationImages: item.customizationImages,
          sellerName: business?.name || 'Unknown Seller',
          businessId: business?.id,
        };
      }),
    };
  }

  async cancelOrder(customerUserId: string, orderId: string, dto: CancelOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch Order
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              variant: {
                include: { product: { select: { isCustomizable: true } } },
              },
            },
          },
        },
      });

      if (!order) throw new NotFoundException(`Order with ID "${orderId}" not found.`);
      if (order.customerUserId !== customerUserId) {
        throw new ForbiddenException('You do not have permission to cancel this order.');
      }

      // 2. Business Rules
      const currentStatus = order.status;
      if (currentStatus === OrderStatus.shipped || currentStatus === OrderStatus.delivered) {
        throw new BadRequestException('Cannot cancel an order that has already been shipped.');
      }
      if (currentStatus === OrderStatus.cancelled) {
        throw new BadRequestException('This order has already been cancelled.');
      }
      if (currentStatus === OrderStatus.processing) {
        const hasCustomizableProduct = order.items.some(
          (item) => item.variant?.product?.isCustomizable === true,
        );
        if (hasCustomizableProduct) {
          throw new BadRequestException(
            'Cannot cancel this order as it contains a customizable product that is already being processed.',
          );
        }
      }

      // 3. Update Order Status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.cancelled,
          cancelledAt: new Date(),
          cancellationReason: `Customer cancellation: ${dto.reason}`,
        },
      });

      // 4. Restock Items
      for (const item of order.items) {
        if (item.variantId) {
          await tx.variant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      // 5. Reverse Coupon Usage
      if (order.couponCode) {
        const usage = await tx.couponUsage.findUnique({ where: { orderId: order.id } });
        if (usage && !usage.isReversed) {
          await tx.couponUsage.update({
            where: { orderId: order.id },
            data: { isReversed: true, reversedAt: new Date() },
          });
          await tx.coupon.update({
            where: { id: usage.couponId },
            data: { usedCount: { decrement: 1 } },
          });
        }
      }

      // 6. Trigger Refund if Paid Online
      if (order.paymentMethod === 'online' && order.paymentStatus === 'completed') {
        console.log(`REFUND TRIGGERED: A refund needs to be processed for order ${order.orderNumber}.`);
      }

      // 7. Notify Sellers
      const businessIds = new Set<string>();
      const itemsWithBusiness = await tx.orderItem.findMany({
        where: { orderId: order.id },
        include: { variant: { include: { product: { select: { businessId: true } } } } },
      });
      itemsWithBusiness.forEach((item) => {
        if (item.variant?.product?.businessId) {
          businessIds.add(item.variant.product.businessId);
        }
      });

      const sellers = await tx.user.findMany({
        where: { businesses: { some: { id: { in: Array.from(businessIds) } } } },
      });
      console.log(`ORDER ${order.orderNumber} cancelled. Notify ${sellers.length} seller(s).`);

      return updatedOrder;
    });
  }
}
