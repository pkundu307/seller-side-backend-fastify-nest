import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SellerPaginationDto } from './dto/seller-pagination.dto';
import { OrderStatus, PaymentMethod, Prisma } from '@prisma/client';
import { UpdateSellerOrderDto } from './dto/update-order.dtp';
import PDFDocument = require('pdfkit');

// Define a type for the address object to cast the JSON to
interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  landmark?: string;
  alternativePhoneNumber?: string;
}
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
async updateOrderStatus(businessId: string, orderId: string, dto: UpdateSellerOrderDto) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        items: {
          some: {
            variant: {
              product: {
                businessId: businessId,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found or it does not belong to your business.`);
    }

    // --- THE FIX IS HERE ---

    // Define the type for allowed transitions more strictly.
    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      pending: [OrderStatus.processing, OrderStatus.cancelled],
      processing: [OrderStatus.shipped, OrderStatus.cancelled],
      shipped: [OrderStatus.delivered],
      // Final states have no further transitions.
      delivered: [], 
      cancelled: [],
    };

    const currentStatus = order.status;
    const nextStatus = dto.status;

    // If the status isn't changing, allow the update (e.g., just adding a tracking number).
    if (currentStatus !== nextStatus) {
      // Check if the transition is defined and valid.
      const possibleNextStatuses = allowedTransitions[currentStatus];
      if (!possibleNextStatuses || !possibleNextStatuses.includes(nextStatus as OrderStatus)) {
        throw new BadRequestException(`Invalid status transition from "${currentStatus}" to "${nextStatus}".`);
      }
    }
    
    // --- END OF FIX ---

    const dataToUpdate: Prisma.OrderUpdateInput = {
      status: dto.status,
      trackingNumber: dto.trackingNumber,
      cancellationReason: dto.cancellationReason,
      estimatedDeliveryDate: dto.estimatedDeliveryDate,
    };

    switch (dto.status) {
      case OrderStatus.processing:
        if (!order.confirmedAt) dataToUpdate.confirmedAt = new Date();
        break;
      case OrderStatus.shipped:
        if (!order.shippedAt) dataToUpdate.shippedAt = new Date();
        break;
      case OrderStatus.delivered:
        if (!order.deliveredAt) dataToUpdate.deliveredAt = new Date();
        break;
      case OrderStatus.cancelled:
        if (!order.cancelledAt) dataToUpdate.cancelledAt = new Date();
        break;
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: dataToUpdate,
    });
    
    return updatedOrder;
  }
async generateShippingLabelPdf(businessId: string, orderId: string): Promise<Buffer> {
    const order = await this.getBusinessOrderById(businessId, orderId);

    // --- FIX 2 & 3: Type check and cast the address object ---
    const shippingAddress = order.customer.shippingAddress as ShippingAddress | null;

    if (!shippingAddress) {
      throw new BadRequestException('Order is missing a valid shipping address.');
    }
    // --- END OF FIX ---

    return new Promise((resolve) => {
      // --- FIX 1: Correctly instantiate PDFDocument ---
      const doc = new PDFDocument({ size: 'A6', margin: 20 });
      // --- END OF FIX ---

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      // --- PDF Content (now using the type-safe shippingAddress variable) ---
      doc.fontSize(14).font('Helvetica-Bold').text('SHIP TO:', { underline: true });
      doc.fontSize(12).font('Helvetica').text(order.customer.name);
      doc.text(shippingAddress.street);
      doc.text(`${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.postalCode}`);
      
      doc.moveDown(2);
      
      doc.fontSize(10).text(`Order #: ${order.orderNumber}`);
      doc.fontSize(8).text(`Payment: ${order.paymentMethod === 'cash_on_delivery' ? 'COD' : 'Prepaid'}`);
      
      if (order.paymentMethod === 'cash_on_delivery') {
         doc.moveDown();
         doc.fontSize(16).font('Helvetica-Bold').text(`COD Amount: ₹${order.totalAmount}`);
      }
      
      // ... add QR code or barcode for tracking number ...

      doc.end();
    });
  }
}