import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, PaymentStatus, NotificationType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { CancelOrderDto } from './dto/cancel-order.dto';

function generateOrderNumber() {
  return `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async createCashOnDeliveryOrder(
    customerUserId: string,
    dto: CreateOrderDto,
  ) {
    // 1. Validate Payment Method
    if (dto.paymentMethod !== 'cash_on_delivery') {
      throw new BadRequestException('This endpoint only supports "cash_on_delivery" orders.');
    }

    if (!dto.cartItemIds || dto.cartItemIds.length === 0) {
      throw new BadRequestException('No items selected for checkout.');
    }

    // 2. Fetch Items & Verify Ownership
    const cartItems = await this.prisma.cartItem.findMany({
      where: { 
        customerUserId, 
        id: { in: dto.cartItemIds } 
      },
      include: {
        variant: {
          include: {
            product: true, // Needed to identify the Business/Seller
          }
        }, 
      },
    });

    if (cartItems.length !== new Set(dto.cartItemIds).size) {
      throw new BadRequestException('One or more selected items are invalid.');
    }

    // 3. Calculate Totals & Identify Sellers
    let totalAmount = new Decimal(0);
    const involvedBusinessIds = new Set<string>();

    for (const item of cartItems) {
      if (!item.variant) throw new NotFoundException(`Variant missing for item ${item.id}`);
      
      const itemTotal = new Decimal(item.variant.price).times(item.quantity);
      totalAmount = totalAmount.plus(itemTotal);
      
      // Collect Business ID to notify the seller later
      if (item.variant.product.businessId) {
        involvedBusinessIds.add(item.variant.product.businessId);
      }
    }
    
    // Apply Extras
    if(dto.shippingFee) totalAmount = totalAmount.plus(dto.shippingFee);
    if(dto.taxAmount) totalAmount = totalAmount.plus(dto.taxAmount);
    if(dto.discount) totalAmount = totalAmount.minus(dto.discount);

    const orderNum = generateOrderNumber();

    // 4. Execute Transaction
    return this.prisma.$transaction(async (tx) => {
      // A. Create Order
      const newOrder = await tx.order.create({
        data: {
          customerUserId,
          totalAmount,
          selectedAddress: dto.selectedAddress ?? {},
          paymentMethod: 'cash_on_delivery',
          paymentStatus: PaymentStatus.pending,
          status: OrderStatus.pending,
          shippingFee: dto.shippingFee || 0,
          taxAmount: dto.taxAmount || 0,
          discount: dto.discount || 0,
          orderNumber: orderNum,
        },
      });

      // B. Create Order Items
      const orderItemsData = cartItems.map((item) => ({
        orderId: newOrder.id,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        priceAtTimeOfOrder: item.variant!.price, 
        customizationImages: item.customizationImages,
        customizationDetails: item.customizationDetails ?? undefined,
      }));

      await tx.orderItem.createMany({ data: orderItemsData });

      // C. Clear Cart
      await tx.cartItem.deleteMany({
        where: { customerUserId, id: { in: dto.cartItemIds } },
      });

      // ---------------- NOTIFICATIONS ----------------
      
      // D. Notify Customer
      await tx.customerNotification.create({
        data: {
          customerUserId: customerUserId,
          title: 'Order Placed',
          message: `Order ${orderNum} placed successfully for ₹${totalAmount}.`,
          type: NotificationType.ORDER,
          metadata: { orderId: newOrder.id, orderNumber: orderNum },
        },
      });

      // E. Notify Sellers (Business Owners)
      const businessIdsArray = Array.from(involvedBusinessIds);
      
      if (businessIdsArray.length > 0) {
        // Find Users who own these businesses
        const sellers = await tx.user.findMany({
          where: {
            businesses: {
              some: { id: { in: businessIdsArray } }
            }
          },
          select: { id: true }
        });

        // Send notification to each seller found
        for (const seller of sellers) {
          await tx.sellerNotification.create({
            data: {
              userId: seller.id,
              title: 'New COD Order',
              message: `You have received a new COD order ${orderNum}.`,
              type: NotificationType.ORDER,
              metadata: { orderId: newOrder.id },
            },
          });
        }
      }

      return newOrder;
    });
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
                  select: { title: true, images: true, slug: true }
                }
              }
            }
          }
        }
      }
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    if (order.customerUserId !== customerUserId) {
      throw new ForbiddenException('Access denied.');
    }

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      // Simplify address logic
      deliveryAddress: order.selectedAddress, 
      estimatedDeliveryDate: order.estimatedDeliveryDate,
      items: order.items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        price: item.priceAtTimeOfOrder,
        productName: item.variant?.product.title || 'Product Unavailable',
        productImage: item.variant?.product.images?.[0] || '',
      }))
    };
  }

    async findAllByCustomer(customerUserId: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        customerUserId: customerUserId,
      },
      orderBy: {
        createdAt: 'desc', // Show newest orders first
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        totalAmount: true,
        createdAt: true,
        estimatedDeliveryDate: true,
        selectedAddress: true, // Useful for "Ship to: Home" display
        items: {
          select: {
            id: true,
            quantity: true,
            priceAtTimeOfOrder: true,
            variant: {
              select: {
                sku: true,
                // Get Product Details
                product: {
                  select: {
                    title: true,
                    images: true, // To show thumbnail in order list
                    slug: true,   // To link back to product page
                  }
                }
              }
            }
          }
        }
      }
    });

    // Optional: Transformation to flatten the structure slightly for frontend convenience
    return orders.map(order => ({
      ...order,
      // Calculate total items count for quick summary
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      // Clean up items structure to handle potentially deleted products safely
      items: order.items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        price: item.priceAtTimeOfOrder,
        productName: item.variant?.product?.title || 'Product Unavailable',
        productImage: item.variant?.product?.images?.[0] || null,
        productSlug: item.variant?.product?.slug || null,
        variantSku: item.variant?.sku || 'N/A'
      }))
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
                    title: true,
                    images: true,
                    slug: true,
                    // FETCH SELLER BUSINESS NAME HERE
                    business: {
                      select: {
                        name: true,
                        id: true, 
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    // SECURITY CHECK: Ensure user owns this order
    if (order.customerUserId !== customerUserId) {
      throw new ForbiddenException('You are not authorized to view this order.');
    }

    // Format the response
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
        .plus(order.discount), // rough reverse calc or just sum items
      shippingFee: order.shippingFee,
      taxAmount: order.taxAmount,
      discount: order.discount,
      
      // Logistics
      selectedAddress: order.selectedAddress,
      estimatedDeliveryDate: order.estimatedDeliveryDate,
      trackingNumber: order.trackingNumber,
      
      // Items with Seller Name
      items: order.items.map(item => {
        const product = item.variant?.product;
        const business = product?.business;

        return {
          id: item.id,
          quantity: item.quantity,
          price: item.priceAtTimeOfOrder,
          total: new Decimal(item.priceAtTimeOfOrder).times(item.quantity),
          
          // Product Details
          productName: product?.title || 'Product Unavailable',
          productSlug: product?.slug,
          productImage: product?.images?.[0] || null,
          variantSku: item.variant?.sku,
          
          // Customization
          customizationDetails: item.customizationDetails,
          customizationImages: item.customizationImages,

          // SELLER INFO
          sellerName: business?.name || 'Unknown Seller',
          sellerId: business?.id
        };
      })
    };
  }


   async cancelOrder(customerUserId: string, orderId: string, dto: CancelOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch the order and its items, ensuring it belongs to the user.
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    select: { isCustomizable: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!order) {
        throw new NotFoundException(`Order with ID "${orderId}" not found.`);
      }
      if (order.customerUserId !== customerUserId) {
        throw new ForbiddenException('You do not have permission to cancel this order.');
      }

      // 2. Apply Cancellation Business Rules
      const currentStatus = order.status;

      if (currentStatus === OrderStatus.shipped || currentStatus === OrderStatus.delivered) {
        throw new BadRequestException('Cannot cancel an order that has already been shipped.');
      }
      if (currentStatus === OrderStatus.cancelled) {
        throw new BadRequestException('This order has already been cancelled.');
      }

      // Special rule for 'processing' state
      if (currentStatus === OrderStatus.processing) {
        // Check if any item in the order is customizable
        const hasCustomizableProduct = order.items.some(
          item => item.variant?.product?.isCustomizable === true,
        );
        if (hasCustomizableProduct) {
          throw new BadRequestException(
            'Cannot cancel this order as it contains a customizable product that is already being processed.',
          );
        }
      }

      // 3. If all checks pass, update the order
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.cancelled,
          cancelledAt: new Date(),
          cancellationReason: `Customer cancellation: ${dto.reason}`,
        },
      });

      // 4. Restock the items
      for (const item of order.items) {
        if (item.variantId) {
          await tx.variant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      // 5. Trigger a refund if the order was paid online
      if (order.paymentMethod === 'online' && order.paymentStatus === 'completed') {
        // Here you would integrate with your payment gateway's refund API
        // For example: await this.razorpay.payments.refund(...)
        // For now, we'll just log it.
        console.log(`REFUND TRIGGERED: A refund needs to be processed for order ${order.orderNumber}.`);
      }

      // 6. Notify the relevant sellers
      const businessIds = new Set<string>();
      const itemsWithBusiness = await tx.orderItem.findMany({
        where: { orderId: order.id },
        include: { variant: { include: { product: { select: { businessId: true } } } } }
      });
      itemsWithBusiness.forEach(item => {
        if (item.variant?.product?.businessId) {
            businessIds.add(item.variant.product.businessId);
        }
      });
      
      const sellers = await tx.user.findMany({
          where: { businesses: { some: { id: { in: Array.from(businessIds) } } } }
      });

      // for (const seller of sellers) {
      //     await this.notificationService.createForSeller(
      //         seller,
      //         'Order Cancelled by Customer',
      //         `Order #${order.orderNumber} has been cancelled by the customer. Reason: ${dto.reason}. Please do not ship.`,
      //         NotificationType.ALERT,
      //         { orderId: order.id }
      //     );
      // }

      return updatedOrder;
    });
  }
}