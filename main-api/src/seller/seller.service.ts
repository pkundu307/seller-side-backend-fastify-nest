import { Injectable, NotFoundException, ForbiddenException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SellerPaginationDto } from './dto/seller-pagination.dto';
import { OrderStatus, PaymentMethod, Prisma } from '@prisma/client';
import { UpdateSellerOrderDto } from './dto/update-order.dtp';
import { CreatePosSaleDto } from './dto/create-pos-sale.dto';

import { PdfService } from './pdf.service';
import { SalePaginationDto } from './dto/sale-pagination.dto';
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
  constructor(private prisma: PrismaService,
    private pdfService: PdfService
  ) {}

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

  async generateShippingLabelPdf(businessId: string, orderId: string, design: 'a4' | 'pos' = 'a4'): Promise<Buffer> {
    console.log(`[PDF] Starting generation for Order ID: ${orderId}, Design: ${design}`);
    
    // 1. Fetch all necessary data for the invoice/label
    console.log('[PDF] Fetching full order details from database...');
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customerUser: { select: { name: true } },
        items: {
          include: {
            variant: {
              select: {
                sku: true,
                hsnCode: true,
                product: {
                  include: {
                    category: { select: { gstRate: true } },
                    business: true, // Fetch the full business object
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      console.error(`[PDF] ERROR: Order with ID "${orderId}" not found.`);
      throw new NotFoundException(`Order with ID "${orderId}" not found.`);
    }

    // 2. Security Check: Ensure the order belongs to the requesting seller
    const belongsToSeller = order.items.some(item => item.variant?.product?.businessId === businessId);
    if (!belongsToSeller) {
      console.error(`[PDF] FORBIDDEN: User tried to access order ${orderId} not belonging to business ${businessId}.`);
      throw new ForbiddenException(`You do not have permission to generate a label for this order.`);
    }
    console.log('[PDF] ✅ Ownership verified.');

    // 3. Delegate to the appropriate builder function in PdfService
    try {
      console.log(`[PDF] Calling PdfService to build '${design}' design...`);
      let pdfBuffer: Buffer;
      if (design === 'pos') {
        pdfBuffer = await this.pdfService.generatePosReceipt(order as any);
      } else {
        pdfBuffer = await this.pdfService.generateA4Invoice(order as any);
      }
      console.log(`[PDF] ✅ PDF buffer created successfully. Size: ${pdfBuffer.length} bytes.`);
      return pdfBuffer;
    } catch (error) {
      console.error('[PDF] ❌ An error occurred during PDF generation:', error);
      throw new InternalServerErrorException('Failed to generate PDF document.');
    }
  }

    async getBusinessSales(businessId: string, query: SalePaginationDto) {
    const { page = 1, limit = 15, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SaleWhereInput = {
      businessId: businessId,
      ...(search && {
        OR: [
          { partyName: { contains: search, mode: 'insensitive' } },
          { invoicePrefix: { contains: search, mode: 'insensitive' } },
          // Note: Searching invoiceNo (Int) requires a different approach if needed
        ],
      }),
    };

    const [sales, totalSales] = await this.prisma.$transaction([
      this.prisma.sale.findMany({
        where,
        skip,
        take: limit,
        orderBy: { invoiceDate: 'desc' },
        // Select only the fields needed for a list view
        select: {
          id: true,
          invoicePrefix: true,
          invoiceNo: true,
          invoiceDate: true,
          partyName: true,
          totalAmount: true,
          status: true,
          isSettled: true,
          balanceAmount: true,
        },
      }),
      this.prisma.sale.count({ where }),
    ]);

    return {
      sales: sales.map(sale => ({
        ...sale,
        invoiceNumber: `${sale.invoicePrefix}-${sale.invoiceNo}`, // Combine for easy display
      })),
      pagination: {
        total: totalSales,
        page,
        limit,
        lastPage: Math.ceil(totalSales / limit),
      },
    };
  }

  /**
   * API: Get a single sale by its ID, ensuring it belongs to the seller.
   */
  async getBusinessSaleById(businessId: string, saleId: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        saleItems: true, // Include all details for the single view
        saleTaxes: true,
        saleAdditionalCharges: true,
      },
    });

    // Security check: ensure the fetched sale belongs to the business
    if (!sale || sale.businessId !== businessId) {
      throw new NotFoundException(`Sale with ID "${saleId}" not found or does not belong to your business.`);
    }

    return sale;
  }
}