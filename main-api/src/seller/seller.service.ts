import { Injectable, NotFoundException, ForbiddenException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SellerPaginationDto } from './dto/seller-pagination.dto';
import { OrderStatus, PaymentMethod, Prisma } from '@prisma/client';
import { UpdateSellerOrderDto } from './dto/update-order.dtp';
import PDFDocument = require('pdfkit');
import { CreatePosSaleDto } from './dto/create-pos-sale.dto';

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
  return this.prisma.$transaction(async (tx) => {
    // 1. Fetch the full order with all necessary relations
    const orderWithRelations = await tx.order.findFirst({
      where: {
        id: orderId,
        items: {
          some: { variant: { product: { businessId: businessId } } },
        },
      },
      include: {
        items: {
          where: { variant: { product: { businessId: businessId } } },
          include: { variant: { select: { sku: true, hsnCode: true } } },
        },
        customerUser: { select: { name: true } },
      },
    });

    if (!orderWithRelations) {
      throw new NotFoundException(`Order with ID "${orderId}" not found or it does not belong to your business.`);
    }

    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      pending: [OrderStatus.processing, OrderStatus.cancelled],
      processing: [OrderStatus.shipped, OrderStatus.cancelled],
      shipped: [OrderStatus.delivered],
      delivered: [],
      cancelled: [],
    };

    const currentStatus = orderWithRelations.status;
    const nextStatus = dto.status;

    // --- Validation logic (no changes here) ---
    if (currentStatus !== nextStatus) {
      if (nextStatus !== undefined) {
        const possibleNextStatuses = allowedTransitions[currentStatus];
        if (!possibleNextStatuses || !possibleNextStatuses.includes(nextStatus)) {
          throw new BadRequestException(`Invalid status transition from "${currentStatus}" to "${nextStatus}".`);
        }
      }
    }

    const dataToUpdate: Prisma.OrderUpdateInput = {
      status: dto.status,
      trackingNumber: dto.trackingNumber,
      cancellationReason: dto.cancellationReason,
      estimatedDeliveryDate: dto.estimatedDeliveryDate,
    };

    if (dto.status) {
      switch (dto.status) {
        case OrderStatus.processing: dataToUpdate.confirmedAt = new Date(); break;
        case OrderStatus.shipped: dataToUpdate.shippedAt = new Date(); break;
        case OrderStatus.delivered: dataToUpdate.deliveredAt = new Date(); break;
        case OrderStatus.cancelled: dataToUpdate.cancelledAt = new Date(); break;
      }
    }

    // 2. Perform the update. The result is a plain Order object.
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: dataToUpdate,
    });

    // --- THE FIX IS HERE ---
    // 3. Check the status on the `updatedOrder`, but pass the `orderWithRelations` to the helper function.
    if (updatedOrder.status === OrderStatus.delivered && currentStatus !== OrderStatus.cancelled) {
      await this._createSaleFromOrder(tx, businessId, orderWithRelations); // <-- PASS THE FULL OBJECT
    }

    // 4. Return the plain updated order object as the result of the API call.
    return updatedOrder;
  });
}

  /**
   * Private helper to create a Sale record from a delivered Order.
   * Must be called within a transaction.
   */
  private async _createSaleFromOrder(
    tx: Prisma.TransactionClient,
    businessId: string,
    order: any, // Using 'any' as it includes relations not on the base Order type
  ) {
    const business = await tx.business.findUnique({ where: { id: businessId }});
    if(!business) throw new InternalServerErrorException("Business not found during sale creation");

    // Check if a sale for this order already exists to prevent duplicates
    const existingSale = await tx.sale.findFirst({ where: { notes: `From E-commerce Order #${order.orderNumber}` } });
    if (existingSale) {
        console.log(`Sale for order ${order.orderNumber} already exists. Skipping.`);
        return;
    }
    
    const address = order.selectedAddress as any;

    await tx.sale.create({
      data: {
        businessId,
        partyId: order.customerUserId, // Store customer ID for reference
        partyName: order.customerUser.name,
        businessName: business.name,
        billingAddress: `${address.street}, ${address.city}, ${address.state} - ${address.postalCode}`,
        shippingAddress: `${address.street}, ${address.city}, ${address.state} - ${address.postalCode}`,
        phoneNo: address.alternativePhoneNumber || '',
        placeOfSupply: address.state,
        invoiceDate: new Date(),
        // These are placeholders; a real invoice number system would be more complex
        invoiceNo: Math.floor(1000 + Math.random() * 9000), 
        invoicePrefix: 'INV',
        totalTaxableAmount: order.totalAmount.minus(order.taxAmount),
        totalTaxAmount: order.taxAmount,
        totalAmount: order.totalAmount,
        discountAmount: order.discount,
        notes: `From E-commerce Order #${order.orderNumber}`,
        status: 'FINALIZED',
        isSettled: order.paymentMethod === 'online', // Assume online is settled
        balanceAmount: order.paymentMethod === 'cash_on_delivery' ? order.totalAmount : 0,

        saleItems: {
          create: order.items.map((item: any) => ({
            itemId: item.variantId,
            itemName: `${item.variant.sku}`, // Best available name
            hsnCode: item.variant.hsnCode || '',
            quantity: item.quantity,
            price: item.priceAtTimeOfOrder,
            taxableAmount: new Prisma.Decimal(item.priceAtTimeOfOrder).times(item.quantity),
            amount: new Prisma.Decimal(item.priceAtTimeOfOrder).times(item.quantity),
            // Defaulting other required fields
            itemDescription: '', sacCode: '', batchNo: '', manufactureDate: new Date(),
            expiryDate: new Date(), priceType: '', unit: '', discountPercent: 0,
            discountAmount: 0, tax: '', taxAmount: 0, cess: '', cessAmount: 0,
            isMrpEnabled: false, isWholesaleEnabled: false, isSerialisationEnabled: false,
            isBatchingEnabled: false, sellingPrice: 0, sellingPriceType: '',
            purchasePrice: 0, purchasePriceType: '', mrp: 0, wholesalePrice: 0,
            wholesalePriceType: '', wholesaleQuantity: 0, itemCode: ''
          })),
        },
        // --- Populating other required fields with defaults ---
        saleType: '', paymentTerm: 0, partyType: '', taxId: '', panNo: '',
        isDiscountAfterTaxEnabled: false, discountPercent: 0, isAutoRoundoffEnabled: false,
        roundoffType: '', roundoffAmount: 0, termCondition: '', isScanItemEnabled: false,
        isConverted: false, party: '', isDueDateEnabled: false, dueDate: new Date()
      },
    });
  }


  async createPosSale(businessId: string, dto: CreatePosSaleDto) {
  const { customerName = 'Walk-in Customer', customerPhone = '', items } = dto;

  const variantIds = items.map(item => item.variantId);
  const variants = await this.prisma.variant.findMany({
    where: {
      id: { in: variantIds },
      product: { businessId: businessId }, // Security check: variants must belong to seller
    },
    select: { id: true, price: true, stock: true, sku: true, hsnCode: true }
  });

  if (variants.length !== variantIds.length) {
    throw new BadRequestException("One or more variants are invalid or do not belong to your business.");
  }
  
  // Check stock and calculate total
  let totalAmount = new Prisma.Decimal(0);
  const saleItemsToCreate = items.map(item => {
    const variant = variants.find(v => v.id === item.variantId);
    if (!variant) throw new InternalServerErrorException(); // Should not happen
    if (variant.stock < item.quantity) {
      throw new BadRequestException(`Insufficient stock for SKU ${variant.sku}. Available: ${variant.stock}, Requested: ${item.quantity}`);
    }
    const itemTotal = variant.price.times(item.quantity);
    totalAmount = totalAmount.plus(itemTotal);
    
    return {
      itemId: variant.id,
      itemName: variant.sku,
      hsnCode: variant.hsnCode || '',
      quantity: item.quantity,
      price: variant.price,
      taxableAmount: itemTotal,
      amount: itemTotal,
      // Defaulting other required SaleItem fields
       itemDescription: '', sacCode: '', batchNo: '', manufactureDate: new Date(),
       expiryDate: new Date(), priceType: '', unit: '', discountPercent: 0,
       discountAmount: 0, tax: '', taxAmount: 0, cess: '', cessAmount: 0,
       isMrpEnabled: false, isWholesaleEnabled: false, isSerialisationEnabled: false,
       isBatchingEnabled: false, sellingPrice: 0, sellingPriceType: '',
       purchasePrice: 0, purchasePriceType: '', mrp: 0, wholesalePrice: 0,
       wholesalePriceType: '', wholesaleQuantity: 0, itemCode: ''
    };
  });

  return this.prisma.$transaction(async (tx) => {
  // 1. Create the Sale record
  const newSale = await tx.sale.create({
    data: {
      businessId: businessId,
      partyName: customerName,
      phoneNo: customerPhone,
      invoiceDate: new Date(),
      invoiceNo: Math.floor(1000 + Math.random() * 9000),
      invoicePrefix: 'POS',
      totalAmount: totalAmount,
      totalTaxableAmount: totalAmount, // Assuming no tax for simplicity
      status: 'FINALIZED',
      isSettled: true, // Assuming POS sales are settled immediately
      balanceAmount: 0,
      notes: 'In-store Point-of-Sale transaction.',
      saleItems: { create: saleItemsToCreate },
      // --- Populating other required fields with defaults ---
      partyId: '', saleType: '', paymentTerm: 0, partyType: '', businessName: '',
      billingAddress: '', shippingAddress: '', placeOfSupply: '', taxId: '', panNo: '',
      isDiscountAfterTaxEnabled: false, discountPercent: 0, discountAmount: 0, totalTaxAmount: 0,
      isAutoRoundoffEnabled: false, roundoffType: '', roundoffAmount: 0, termCondition: '',
      isScanItemEnabled: false, isConverted: false, party: '', isDueDateEnabled: false, dueDate: new Date()
    },
  });
    
    // 2. Decrement stock for each variant
    for (const item of items) {
      await tx.variant.update({
        where: { id: item.variantId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    return newSale;
  });
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
      const doc = new PDFDocument({ size: 'A4', margin: 20 });
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
  }}