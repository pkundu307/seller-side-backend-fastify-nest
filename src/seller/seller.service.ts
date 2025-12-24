import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SellerPaginationDto } from './dto/seller-pagination.dto';
import { OrderStatus, PaymentMethod, Prisma } from '@prisma/client';

@Injectable()
export class SellerService {
  constructor(private prisma: PrismaService) {}

  /**
   * API 1: Get all orders for a specific business, with pagination and stats.
   */
  async getBusinessOrders(businessId: string, query: SellerPaginationDto) {
    const { page = 1, limit = 10, status, paymentMethod, search } = query;
    const skip = (page - 1) * limit;

    // --- Build Dynamic Where Clause for Filtering ---
    const where: Prisma.OrderWhereInput = {
      items: {
        some: {
          // --- FIX 1: Correctly query through the nested relation ---
          // OrderItem -> Variant -> Product -> businessId
          variant: {
            product: {
              businessId: businessId,
            },
          },
        },
      },
      status: status ? { equals: status } : undefined,
      paymentMethod: paymentMethod ? { equals: paymentMethod } : undefined,
      orderNumber: search ? { contains: search, mode: 'insensitive' } : undefined,
    };

    // --- Fetch Paginated Orders ---
    const orders = await this.prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        totalAmount: true,
        status: true,
        paymentMethod: true,
        customerUser: {
          select: { name: true },
        },
        _count: {
          select: { items: true },
        },
      },
    });

    // --- Fetch Order Statistics (Queries are now also corrected) ---
    const totalOrders = this.prisma.order.count({ where });
    const cashOnDeliveryOrders = this.prisma.order.count({ where: { ...where, paymentMethod: PaymentMethod.cash_on_delivery } });
    const onlineOrders = this.prisma.order.count({ where: { ...where, paymentMethod: PaymentMethod.online } });
    const deliveredOrders = this.prisma.order.count({ where: { ...where, status: OrderStatus.delivered } });
    const pendingOrders = this.prisma.order.count({ where: { ...where, status: OrderStatus.pending } });

    const [total, cod, online, delivered, pending] = await Promise.all([
      totalOrders,
      cashOnDeliveryOrders,
      onlineOrders,
      deliveredOrders,
      pendingOrders,
    ]);

    return {
      orders,
      stats: {
        totalOrders: total,
        cashOnDeliveryOrders: cod,
        onlineOrders: online,
        deliveredOrders,
        pendingOrders,
      },
      pagination: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  /**
   * API 2: Get a single order by ID, ensuring it belongs to the seller.
   */
  async getBusinessOrderById(businessId: string, orderId: string) {
    // --- FIX 2: Add `include` to fetch the relations needed later ---
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          where: {
            // --- FIX 3: Correct nested path for filtering items ---
            variant: {
              product: {
                businessId: businessId,
              },
            },
          },
          include: {
            variant: {
              select: {
                sku: true,
                images: true, // Also good to return variant images
                attributeValues: {
                  include: {
                    attribute: { select: { name: true } },
                    attributeOption: { select: { value: true } },
                  },
                },
              },
            },
            // --- FIX 4: Correctly include the Product through the Variant ---
            // This structure is for fetching, not filtering.
            // We can't include Product directly from OrderItem.
          },
        },
        customerUser: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found.`);
    }

    // --- FIX 5: Now `order.items` and `order.customerUser` exist and can be accessed ---
    if (order.items.length === 0) {
      throw new ForbiddenException(`You do not have permission to view this order as it contains no items from your business.`);
    }
    
    // Sanitize the response to hide personal info
    const { customerUser, ...restOfOrder } = order;
    return {
      ...restOfOrder,
      customer: {
        name: customerUser.name,
        shippingAddress: order.selectedAddress,
      },
    };
  }
}