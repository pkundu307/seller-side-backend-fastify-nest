import { Injectable, NotFoundException, ForbiddenException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SellerPaginationDto } from './dto/seller-pagination.dto';
import { BankCashCheque, OrderStatus, PaymentMethod, Prisma } from '@prisma/client';
import { UpdateSellerOrderDto } from './dto/update-order.dtp';
import { CreatePosSaleDto, PosPaymentMode } from './dto/create-pos-sale.dto';
import { UpdatePosSaleDto } from './dto/update-pos-sale.dto';
import { PdfService } from './pdf.service';
import { SalePaginationDto } from './dto/sale-pagination.dto';
import { GetSalesStatsDto } from './dto/get-sales-stats.dto';
import { GetPosCustomersDto } from './dto/get-pos-customers.dto';
import { DashboardFilterDto } from './dto/dashboard-filter.dto';
import { SellerReplyTicketDto, SellerTicketQueryDto, UpdateTicketStatusDto } from './dto/seller-ticket.dto';
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
       isConverted: false, 
isDueDateEnabled: false, 
dueDate: new Date()
      },
    });
  }


// seller.service.ts
async createPosSale(businessId: string, dto: CreatePosSaleDto) {
    const {
      customerName = 'Walk-in Customer',
      customerPhone = '',
      items,
      paymentMode = PosPaymentMode.CASH,
      amountReceived,
      additionalCharges = [],
      gstin = '',
      address = '',
      pan = '',
      email = '', // Extract email from DTO
      depositAccountId,
    } = dto;

    // 0. Fetch Business Name
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { name: true },
    });

    if (!business) throw new NotFoundException('Business not found');

    // 1. Fetch Variants
    const variantIds = items.map((item) => item.variantId);
    const variants = await this.prisma.variant.findMany({
      where: {
        id: { in: variantIds },
        product: { businessId: businessId },
      },
      include: { product: { select: { title: true } } },
    });

    if (variants.length !== variantIds.length) {
      throw new BadRequestException('One or more items do not belong to your business.');
    }

    // 2. Calculate ITEM Totals
    let totalItemsAmountDec = new Prisma.Decimal(0);
    const saleItemsData: Prisma.SaleItemCreateWithoutSaleInput[] = [];

    for (const item of items) {
      const variant = variants.find((v) => v.id === item.variantId);
      if (!variant) continue;

      if (variant.stock < item.quantity) {
        throw new BadRequestException(`Insufficient stock: ${variant.product.title}`);
      }

      const quantityDec = new Prisma.Decimal(item.quantity);
      const priceDec = new Prisma.Decimal(variant.price);
      const itemTotalDec = priceDec.times(quantityDec);

      totalItemsAmountDec = totalItemsAmountDec.plus(itemTotalDec);

      saleItemsData.push({
        itemId: variant.id,
        itemName: `${variant.product.title} - ${variant.sku}`,
        itemCode: variant.sku,
        itemDescription: variant.description || '',
        quantity: quantityDec,
        price: priceDec,
        unit: variant.dimensionUnit || 'PCS',
        taxableAmount: itemTotalDec,
        amount: itemTotalDec,
        hsnCode: variant.hsnCode || '',
        sacCode: variant.sacCode || '',
        batchNo: '',
        manufactureDate: new Date(),
        expiryDate: new Date(),
        priceType: 'MRP',
        discountPercent: new Prisma.Decimal(0),
        discountAmount: new Prisma.Decimal(0),
        tax: '0%',
        taxAmount: new Prisma.Decimal(0),
        cess: '',
        cessAmount: new Prisma.Decimal(0),
        isMrpEnabled: true,
        isWholesaleEnabled: false,
        isSerialisationEnabled: false,
        isBatchingEnabled: false,
        sellingPrice: priceDec,
        sellingPriceType: 'MRP',
        purchasePrice: variant.purchasePrice || new Prisma.Decimal(0),
        purchasePriceType: 'MRP',
        mrp: variant.mrp || new Prisma.Decimal(0),
        wholesalePrice: new Prisma.Decimal(0),
        wholesalePriceType: '',
        wholesaleQuantity: new Prisma.Decimal(0),
      });
    }

    // 3. Calculate ADDITIONAL CHARGES
    let totalChargesDec = new Prisma.Decimal(0);
    const additionalChargesData: Prisma.SaleAdditionalChargeCreateWithoutSaleInput[] = [];

    if (additionalCharges && additionalCharges.length > 0) {
      for (const charge of additionalCharges) {
        const chargeAmount = new Prisma.Decimal(charge.amount);
        totalChargesDec = totalChargesDec.plus(chargeAmount);
        additionalChargesData.push({
          name: charge.name,
          amount: chargeAmount,
          tax: '0',
        });
      }
    }

    // 4. Final Financials
    const grandTotalDec = totalItemsAmountDec.plus(totalChargesDec);
    const amountReceivedDec = new Prisma.Decimal(amountReceived || 0);
    const balanceAmountDec = grandTotalDec.minus(amountReceivedDec);
    const isSettled = balanceAmountDec.lte(0);

    return this.prisma.$transaction(async (tx) => {
      // 5. ACCOUNTING: Resolve Shop Account
      let targetAccount: BankCashCheque | null = null;

      if (depositAccountId) {
        targetAccount = await tx.bankCashCheque.findFirst({
          where: { id: depositAccountId, businessId, isEnabled: true },
        });
        if (!targetAccount) throw new BadRequestException('Selected account is invalid.');
      } else {
        const targetAccountType = paymentMode === 'CASH' ? 'CASH' : { in: ['BANK', 'UPI'] };
        targetAccount = await tx.bankCashCheque.findFirst({
          where: {
            businessId,
            accountType: targetAccountType as any,
            isEnabled: true,
          },
          orderBy: { isDefault: 'desc' },
        });

        if (!targetAccount) {
          targetAccount = await tx.bankCashCheque.create({
            data: {
              businessId,
              accountName: paymentMode === 'CASH' ? 'Cash Drawer' : 'Main Bank Account',
              accountType: paymentMode === 'CASH' ? 'CASH' : 'BANK',
              isDefault: true,
              isEnabled: true,
              openingBalance: 0,
              closingBalance: 0,
            },
          });
        }
      }

      // 6. CUSTOMER LOGIC
      let customerUserId: string | undefined = undefined;

      if (balanceAmountDec.greaterThan(0) || customerPhone) {
        if (!customerPhone && balanceAmountDec.greaterThan(0)) {
          throw new BadRequestException('Customer Phone Number is required for Credit sales.');
        }
        if (customerPhone) {
          const customer = await this.findOrCreatePosCustomer(tx, customerName, customerPhone);
          customerUserId = customer.id;
        }
      }

      // 7. Generate Invoice Number
      const lastSale = await tx.sale.findFirst({
        where: { businessId },
        orderBy: { invoiceNo: 'desc' },
        select: { invoiceNo: true },
      });
      const nextInvoiceNo = (lastSale?.invoiceNo || 0) + 1;

      // 8. Create the Sale
      const newSale = await tx.sale.create({
        data: {
          businessId,
          businessName: business.name,
          partyName: customerName,
          phoneNo: customerPhone,
          partyId: customerUserId || '',
          partyType: customerUserId ? 'Registered' : 'Unregistered',
          placeOfSupply: '',
          invoicePrefix: 'POS',
          invoiceNo: nextInvoiceNo,
          invoiceDate: new Date(),
          isDueDateEnabled: false,
          dueDate: new Date(),
          paymentTerm: 0,
          totalAmount: grandTotalDec,
          totalTaxableAmount: totalItemsAmountDec,
          totalTaxAmount: new Prisma.Decimal(0),
          balanceAmount: balanceAmountDec.greaterThan(0) ? balanceAmountDec : 0,
          isSettled: isSettled,
          status: 'FINALIZED',
          isScanItemEnabled: false,
          isConverted: false,
          isDiscountAfterTaxEnabled: false,
          isAutoRoundoffEnabled: false,
          notes: 'POS Transaction',
          termCondition: '',
          billingAddress: address,
          shippingAddress: address,
          taxId: gstin,
          panNo: pan,
          discountPercent: new Prisma.Decimal(0),
          discountAmount: new Prisma.Decimal(0),
          roundoffType: '',
          roundoffAmount: new Prisma.Decimal(0),
          saleType: paymentMode === 'CASH' ? 'CASH' : 'BANK',
          saleItems: { create: saleItemsData },
          saleAdditionalCharges: { create: additionalChargesData },
          salePaymentModes: amountReceivedDec.greaterThan(0) && targetAccount
            ? {
                create: {
                  bankCashChequeId: targetAccount.id,
                  accountName: targetAccount.accountName,
                  paymentMode: paymentMode,
                  amount: amountReceivedDec,
                  ifsc: targetAccount.bankIfscCode || '',
                  acNo: targetAccount.bankAccountNo || '',
                },
              }
            : undefined,
        },
        include: { saleItems: true, saleAdditionalCharges: true },
      });

      // 9. UPDATE SHOP LEDGER
      if (amountReceivedDec.greaterThan(0) && targetAccount) {
        await tx.bankCashCheque.update({
          where: { id: targetAccount.id },
          data: { closingBalance: { increment: amountReceivedDec } },
        });

        await tx.bankCashChequeTransaction.create({
          data: {
            businessId,
            accountId: targetAccount.id,
            transactionType: 'CREDIT',
            amount: amountReceivedDec,
            runningBalance: targetAccount.closingBalance.plus(amountReceivedDec),
            referenceId: newSale.id,
            referenceType: 'SALE',
            invoiceNo: `POS-${nextInvoiceNo}`,
            paymentMode: paymentMode,
            partyName: customerName,
          },
        });
      }

      // 10. UPDATE CUSTOMER LEDGER (Party Ledger)
      console.log(customerName,customerPhone);
      
      if (balanceAmountDec.greaterThan(0) && customerUserId) {
        await tx.partyLedger.create({
          data: {
            businessId,
            partyType: 'CUSTOMER',
            referenceId: customerUserId,
            partyName: customerName,
            
            // --- MAPPING NEW FIELDS ---
            phoneNo: customerPhone || null,
            email: email || null,
            gstin: gstin || null,
            // -------------------------

            transactionDate: new Date(),
            description: `Credit Sale Inv #POS-${nextInvoiceNo}`,
            debit: balanceAmountDec,
            credit: 0,
            linkedSaleId: newSale.id,
          },
        });
      }

      // 11. Decrement Stock
      for (const item of items) {
        await tx.variant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return newSale;
    });
  }
  // --- Helper to Create Shadow Accounts ---
  private async findOrCreatePosCustomer(tx: any, name: string, phone: string) {
    let customer = await tx.customerUser.findUnique({ where: { phoneNumber: phone } });
    console.log(phone,name);
    
    if (!customer) {
      customer = await tx.customerUser.create({
        data: {
          name: name || 'Unknown',
          phoneNumber: phone,
          email: `${phone}@pos.local`, // Dummy email
          authSource: 'self',
          type: 'user',
          isPhoneVerified: true,
        },
      });
    }
    return customer;
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
    const { page = 1, limit = 15, search, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    // --- 1. Date Range Logic ---
    let dateFrom: Date;
    let dateTo: Date;

    if (startDate || endDate) {
      // If user provides dates, use them.
      // If one is missing, default to far past or current future, 
      // but usually, UI sends both or none. Here we handle defaults if partial.
      dateFrom = startDate ? new Date(startDate) : new Date(0); // Epoch if missing
      dateTo = endDate ? new Date(endDate) : new Date(); // Now if missing
    } else {
      // Default: Current Day (End) and 7 Days Ago (Start)
      const today = new Date();
      dateTo = new Date(today);
      
      const pastDate = new Date(today);
      pastDate.setDate(today.getDate() - 7);
      dateFrom = pastDate;
    }

    // IMPORTANT: Set times to ensure we cover the whole day
    // Start of the 'From' day (00:00:00)
    dateFrom.setHours(0, 0, 0, 0);
    // End of the 'To' day (23:59:59)
    dateTo.setHours(23, 59, 59, 999);

    // --- 2. Build Where Clause ---
    const where: Prisma.SaleWhereInput = {
      businessId: businessId,
      invoiceDate: {
        gte: dateFrom,
        lte: dateTo,
      },
      ...(search && {
        OR: [
          { partyName: { contains: search, mode: 'insensitive' } },
          { invoicePrefix: { contains: search, mode: 'insensitive' } },
          // For Invoice No (Int), we can't use 'contains'. 
          // If search is a number, we can try exact match
          ...(Number(search) ? [{ invoiceNo: Number(search) }] : [])
        ],
      }),
    };

    // --- 3. Query Database ---
    const [sales, totalSales] = await this.prisma.$transaction([
      this.prisma.sale.findMany({
        where,
        skip,
        take: limit,
        orderBy: { invoiceDate: 'desc' },
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
        invoiceNumber: `${sale.invoicePrefix}-${sale.invoiceNo}`,
      })),
      pagination: {
        total: totalSales,
        page,
        limit,
        lastPage: Math.ceil(totalSales / limit),
      },
      // Optional: Return the applied date range so frontend knows what was filtered
      dateRange: {
        from: dateFrom,
        to: dateTo
      }
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
         salePaymentModes: true,
        business: true
      },
    });

    // Security check: ensure the fetched sale belongs to the business
    if (!sale || sale.businessId !== businessId) {
      throw new NotFoundException(`Sale with ID "${saleId}" not found or does not belong to your business.`);
    }

    return sale;
  }

  async getSalesStats(businessId: string, query: GetSalesStatsDto) {
    // 1. Determine Date Range (Default to last 30 days)
    const end = query.to ? new Date(query.to) : new Date();
    const start = query.from ? new Date(query.from) : new Date(new Date().setDate(end.getDate() - 30));

    // Ensure strictly valid date objects for Prisma
    // Setting time to start of day and end of day to cover full days
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const whereCondition: Prisma.SaleWhereInput = {
      businessId: businessId,
      invoiceDate: {
        gte: start,
        lte: end,
      },
      status: { not: 'CANCELLED' } // Exclude cancelled sales
    };

    // 2. Parallel Queries for Efficiency
    const [aggregates, paymentModes, topProducts, timeline] = await Promise.all([
      
      // A. Key Metrics (Total Revenue, Count, Tax)
      this.prisma.sale.aggregate({
        where: whereCondition,
        _sum: {
          totalAmount: true,
          totalTaxAmount: true,
          balanceAmount: true,
        },
        _count: {
          id: true,
        },
      }),

      // B. Payment Method Breakdown
      this.prisma.salePaymentMode.groupBy({
        by: ['paymentMode'],
        where: {
          sale: whereCondition, // Filter by the same date range/business
        },
        _sum: {
          amount: true,
        },
      }),

      // C. Top 5 Selling Products (by Quantity)
      this.prisma.saleItem.groupBy({
        by: ['itemName', 'itemCode'], // Group by Name and SKU
        where: {
          sale: whereCondition,
        },
        _sum: {
          quantity: true,
          amount: true,
        },
        orderBy: {
          _sum: {
            quantity: 'desc',
          },
        },
        take: 5,
      }),

      // D. Sales Timeline (Graph Data) - Using Raw SQL for Postgres Date Truncation
      this.prisma.$queryRaw<{ date: Date; total: number; count: number }[]>`
        SELECT 
          DATE("invoiceDate") as date, 
          SUM("totalAmount") as total,
          COUNT(id) as count
        FROM "Sale"
        WHERE "businessId" = ${businessId}
          AND "invoiceDate" >= ${start}
          AND "invoiceDate" <= ${end}
          AND "status" != 'CANCELLED'
        GROUP BY DATE("invoiceDate")
        ORDER BY date ASC
      `
    ]);

    // 3. Process and Format Data
    const totalRevenue = aggregates._sum.totalAmount || 0;
    const totalOrders = aggregates._count.id || 0;
    
    // Calculate Average Order Value (AOV)
    const avgOrderValue = totalOrders > 0 
      ? Number(totalRevenue) / totalOrders 
      : 0;

    return {
      meta: {
        from: start,
        to: end,
      },
      summary: {
        totalRevenue: totalRevenue,
        totalOrders: totalOrders,
        totalTaxCollected: aggregates._sum.totalTaxAmount || 0,
        outstandingBalance: aggregates._sum.balanceAmount || 0,
        averageOrderValue: avgOrderValue.toFixed(2),
      },
      paymentMethods: paymentModes.map(pm => ({
        method: pm.paymentMode,
        amount: pm._sum.amount || 0,
      })),
      topProducts: topProducts.map(p => ({
        name: p.itemName,
        sku: p.itemCode,
        quantitySold: p._sum.quantity || 0,
        revenueGenerated: p._sum.amount || 0,
      })),
      timeline: timeline.map(t => ({
        date: t.date, // ISO Date string
        revenue: t.total,
        orders: Number(t.count), // Raw count usually comes as BigInt in raw queries, ensure casting
      })),
    };
  }

async getPosProducts(businessId: string, search?: string) {
  // 1. Base Condition: Always filter by business, active status, and not deleted
  const whereCondition: Prisma.ProductWhereInput = {
    businessId,
    deletedAt: null,
  };

  // 2. Add Search Logic (Only if search string exists)
  if (search && search.trim() !== '') {
    whereCondition.OR = [
      { title: { contains: search, mode: 'insensitive' } }, // Search Name
      { 
        variants: { 
          some: { 
            sku: { contains: search, mode: 'insensitive' }, // Search SKU/Barcode
            deletedAt: null 
          } 
        } 
      },
    ];
  }

  // 3. Fetch Data
  const products = await this.prisma.product.findMany({
    where: whereCondition,
    take: 100, // Limit results
    orderBy: { title: 'asc' }, // A-Z order
    select: {
      id: true,
      title: true,
      images: true,
      variants: {
        where: { 
          deletedAt: null,
          status: 'ACTIVE' 
        },
        select: {
          id: true,
          sku: true,
          price: true,
          stock: true,
          dimensionUnit: true,
          attributeValues: {
            select: {
              attributeOption: { select: { value: true } }
            }
          }
        }
      }
    }
  });

  // 4. Transform for Frontend
  return products.map(p => ({
    id: p.id,
    title: p.title,
    image: p.images?.[0] || null, // 1st image only
    variants: p.variants.map(v => ({
      variantId: v.id,
      sku: v.sku,
      price: Number(v.price), // Ensure number type
      stock: v.stock,
      unit: v.dimensionUnit,
      // Creates string like "Red / XL" or "" if no attributes
      attributes: v.attributeValues.map(av => av.attributeOption.value).join(' / ') 
    }))
  }));
}

async getPosCustomers(businessId: string, query: GetPosCustomersDto) {
  const { page = 1, limit = 10, search } = query;
  const skip = (page - 1) * limit;

  // 1. Get IDs from SALES (Active Buyers)
  const salesPromise = this.prisma.sale.findMany({
    where: { businessId, partyId: { not: undefined }, deletedAt: null },
    select: { partyId: true },
    distinct: ['partyId']
  });

  // 2. Get IDs from LEDGER (People with Opening Balance/Manual Credit)
  const ledgerPromise = this.prisma.partyLedger.findMany({
    where: { businessId, referenceId: { not: null } }, // referenceId links to CustomerUser
    select: { referenceId: true },
    distinct: ['referenceId']
  });

  const [sales, ledgerEntries] = await Promise.all([salesPromise, ledgerPromise]);

  // 3. Merge and De-duplicate IDs
  const allCustomerIds = new Set([
    ...sales.map(s => s.partyId),
    ...ledgerEntries.map(l => l.referenceId)
  ]);
  
  // Convert to array and filter out empty strings/nulls
  const uniqueIds = Array.from(allCustomerIds).filter((id): id is string => id !== null);

  // 4. Filter CustomerUser Table (The Source of Truth)
  const whereCondition: Prisma.CustomerUserWhereInput = {
    id: { in: uniqueIds },
    deletedAt: null,
  };

  // 5. Apply Search (Name/Phone/Email)
  if (search) {
    whereCondition.AND = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    };
  }

  // 6. Fetch Full Profiles with Ledger Balance
  // We perform a transaction to get the profiles AND count total for pagination
  const [customers, total] = await this.prisma.$transaction([
    this.prisma.customerUser.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        email: true,
        picture: true,
        addresses: {
          where: { isDefault: true },
          take: 1,
          select: { street: true, city: true }
        },
        // OPTIONAL: Fetch their wallet/ledger balance summary here if needed
        wallet: { select: { balance: true } } 
      }
    }),
    this.prisma.customerUser.count({ where: whereCondition }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data: customers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phoneNumber,
      // Hide the dummy "shadow" emails we generate
      email: c.email && c.email.endsWith('@pos.local') ? null : c.email, 
      address: c.addresses[0] ? `${c.addresses[0].street}, ${c.addresses[0].city}` : null,
      balance: c.wallet?.balance || 0 // Current Wallet Balance
    })),
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
    },
  };
}

async updatePosSale(businessId: string, saleId: string, dto: UpdatePosSaleDto) {
    // 1. Fetch Existing Sale
    const existingSale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: { 
        saleItems: true, 
        salePaymentModes: true,
        saleAdditionalCharges: true 
      }
    });

    if (!existingSale || existingSale.businessId !== businessId) {
      throw new NotFoundException("Sale not found");
    }

    // 2. Fetch Variants for New Items
    const variantIds = dto.items.map(i => i.variantId);
    const variants = await this.prisma.variant.findMany({
      where: { id: { in: variantIds }, product: { businessId } },
      include: { product: { select: { title: true } } }
    });

    if (variants.length !== variantIds.length) throw new BadRequestException("Invalid items.");

    return this.prisma.$transaction(async (tx) => {
      // --- A. REVERT OLD STATE ---

      // A1. Revert Stock
      for (const oldItem of existingSale.saleItems) {
        await tx.variant.update({
          where: { id: oldItem.itemId }, 
          data: { stock: { increment: Number(oldItem.quantity) } }
        });
      }

      // A2. Revert Shop Ledger
      if (existingSale.salePaymentModes.length > 0) {
        const oldPayment = existingSale.salePaymentModes[0];
        await tx.bankCashCheque.update({
          where: { id: oldPayment.bankCashChequeId },
          data: { closingBalance: { decrement: oldPayment.amount } }
        });
        await tx.bankCashChequeTransaction.create({
          data: {
            businessId,
            accountId: oldPayment.bankCashChequeId,
            transactionType: 'DEBIT',
            amount: oldPayment.amount,
            runningBalance: 0, 
            referenceId: saleId,
            referenceType: 'SALE',
            invoiceNo: `REV-${existingSale.invoicePrefix}-${existingSale.invoiceNo}`,
            partyName: `Correction: ${existingSale.partyName}`,
            transactionNo: 'REVERSAL'
          }
        });
      }

      // A3. Revert Customer Ledger
      // FIX: Use 'partyId' instead of 'customerUserId'
      if (Number(existingSale.balanceAmount) > 0 && existingSale.partyId) {
        await tx.partyLedger.deleteMany({
          where: { linkedSaleId: saleId }
        });
      }

      // A4. Delete Old Details
      await tx.saleItem.deleteMany({ where: { saleId } });
      await tx.saleAdditionalCharge.deleteMany({ where: { saleId } });
      await tx.salePaymentMode.deleteMany({ where: { saleId } });


      // --- B. CALCULATE NEW STATE ---
      
      let totalItemsAmountDec = new Prisma.Decimal(0);
      const saleItemsData: Prisma.SaleItemCreateWithoutSaleInput[] = [];

      for (const item of dto.items) {
        const variant = variants.find(v => v.id === item.variantId);
        
        if (!variant) continue;

        const quantityDec = new Prisma.Decimal(item.quantity);
        const priceDec = new Prisma.Decimal(variant.price);
        const itemTotal = priceDec.times(quantityDec);
        totalItemsAmountDec = totalItemsAmountDec.plus(itemTotal);

        saleItemsData.push({
          itemId: variant.id,
          itemName: `${variant.product.title} - ${variant.sku}`,
          itemCode: variant.sku,
          quantity: quantityDec,
          price: priceDec,
          amount: itemTotal,
          taxableAmount: itemTotal,
          unit: variant.dimensionUnit || 'PCS',
          hsnCode: variant.hsnCode || '', itemDescription: '', sacCode: '', batchNo: '', manufactureDate: new Date(), expiryDate: new Date(), priceType: 'MRP', discountPercent: 0, discountAmount: 0, tax: '0%', taxAmount: 0, cess: '', cessAmount: 0, isMrpEnabled: true, isWholesaleEnabled: false, isSerialisationEnabled: false, isBatchingEnabled: false, sellingPrice: priceDec, sellingPriceType: 'MRP', purchasePrice: 0, purchasePriceType: 'MRP', mrp: 0, wholesalePrice: 0, wholesalePriceType: '', wholesaleQuantity: 0
        });
      }

      // Charges
      let totalChargesDec = new Prisma.Decimal(0);
      const chargesData: Prisma.SaleAdditionalChargeCreateWithoutSaleInput[] = [];
      
      if (dto.additionalCharges) {
        for (const ch of dto.additionalCharges) {
          const amt = new Prisma.Decimal(ch.amount);
          totalChargesDec = totalChargesDec.plus(amt);
          chargesData.push({ name: ch.name, amount: amt, tax: '0' });
        }
      }

      const grandTotalDec = totalItemsAmountDec.plus(totalChargesDec);
      const receivedDec = new Prisma.Decimal(dto.amountReceived || 0);
      const balanceDec = grandTotalDec.minus(receivedDec);
      const isSettled = balanceDec.lte(0);

      // --- C. APPLY NEW STATE ---

      // C1. Update Sale Header
      const updatedSale = await tx.sale.update({
        where: { id: saleId },
        data: {
          partyName: dto.customerName,
          phoneNo: dto.customerPhone,
          totalAmount: grandTotalDec,
          totalTaxableAmount: totalItemsAmountDec,
          balanceAmount: balanceDec.greaterThan(0) ? balanceDec : 0,
          isSettled,
          status: 'FINALIZED',
          notes: 'Updated POS Transaction',
          
          saleItems: { create: saleItemsData },
          saleAdditionalCharges: { create: chargesData }
        }
      });

      // C2. Handle Financials
      if (receivedDec.greaterThan(0)) {
        let targetAccount: BankCashCheque | null = null;
        
        if (dto.depositAccountId) {
           targetAccount = await tx.bankCashCheque.findFirst({ where: { id: dto.depositAccountId } });
        } else {
           const type = dto.paymentMode === 'CASH' ? 'CASH' : { in: ['BANK', 'UPI'] };
           targetAccount = await tx.bankCashCheque.findFirst({ where: { businessId, accountType: type as any, isEnabled: true } });
        }

        if (targetAccount) {
          await tx.bankCashCheque.update({
            where: { id: targetAccount.id },
            data: { closingBalance: { increment: receivedDec } }
          });
          await tx.bankCashChequeTransaction.create({
            data: {
              businessId, accountId: targetAccount.id, transactionType: 'CREDIT',
              amount: receivedDec, runningBalance: 0, 
              referenceId: saleId, referenceType: 'SALE', invoiceNo: `UPD-${updatedSale.invoiceNo}`,
              partyName: dto.customerName
            }
          });
          await tx.salePaymentMode.create({
            data: {
              saleId,
              bankCashChequeId: targetAccount.id,
              accountName: targetAccount.accountName,
              paymentMode: dto.paymentMode || 'CASH', // Fallback to CASH if undefined
              amount: receivedDec,
              ifsc: '', acNo: ''
            }
          });
        }
      }

      // C3. Handle Customer Ledger
      // FIX: Use 'partyId' instead of 'customerUserId'
      if (balanceDec.greaterThan(0) && existingSale.partyId) {
        await tx.partyLedger.create({
          data: {
            businessId, partyType: 'CUSTOMER', referenceId: existingSale.partyId,
            partyName: dto.customerName || 'Unknown', transactionDate: new Date(),
            description: `Updated Inv #${updatedSale.invoiceNo}`,
            debit: balanceDec, credit: 0, linkedSaleId: saleId
          }
        });
      }

      // C4. Deduct New Stock
      for (const item of dto.items) {
        await tx.variant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } }
        });
      }

      return updatedSale;
    });
  }

  async verifyBusinessOwnership(userId: string, businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true },
    });

    if (!business) {
      throw new NotFoundException(`Business with ID "${businessId}" not found`);
    }

    if (business.ownerId !== userId) {
      throw new ForbiddenException('You do not have permission to access this business.');
    }
  }


async getDashboardOverview(businessId: string, query: DashboardFilterDto) {
    // 1. Date Logic
    const end = query.endDate ? new Date(query.endDate) : new Date();
    const start = query.startDate ? new Date(query.startDate) : new Date();
    
    if (!query.startDate) {
      start.setDate(end.getDate() - 30);
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // 2. Run Parallel Queries
    const [
      totalSalesAgg,
      totalPurchasesAgg,
      totalReceivablesAgg,
      totalPayablesAgg,
      recentSales,
      recentPurchases,
      recentOnlineOrders,
      salesGraphData
    ] = await this.prisma.$transaction([
      
      // A. Total Sales
      this.prisma.sale.aggregate({
        where: { 
          businessId, 
          status: { not: 'CANCELLED' },
          invoiceDate: { gte: start, lte: end } 
        },
        _sum: { totalAmount: true }
      }),

      // B. Total Purchases
      this.prisma.purchase.aggregate({
        where: { 
          businessId, 
          status: { not: 'CANCELLED' },
          purchaseOrderDate: { gte: start, lte: end } 
        },
        _sum: { totalAmount: true }
      }),

      // C. Receivables (All Time)
      this.prisma.sale.aggregate({
        where: { 
          businessId, 
          status: { not: 'CANCELLED' },
          isSettled: false,
          balanceAmount: { gt: 0 }
        },
        _sum: { balanceAmount: true }
      }),

      // D. Payables (All Time)
      this.prisma.purchase.aggregate({
        where: { 
          businessId, 
          status: { not: 'CANCELLED' },
          balanceDue: { gt: 0 }
        },
        _sum: { balanceDue: true }
      }),

      // E. Last 5 Sales
      this.prisma.sale.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          invoiceNo: true,
          invoicePrefix: true,
          partyName: true,
          totalAmount: true,
          status: true,
          invoiceDate: true
        }
      }),

      // F. Last 5 Purchases
      this.prisma.purchase.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          purchaseOrderNo: true,
          supplierName: true,
          totalAmount: true,
          status: true,
          purchaseOrderDate: true
        }
      }),

      // G. Last 5 Online Orders
      this.prisma.order.findMany({
        where: { 
          // FIX 1: Go through 'variant' to get to 'product'
          items: { some: { variant: { product: { businessId } } } } 
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { customerUser: { select: { name: true } } }
      }),

      // H. Graph Data
      this.prisma.$queryRaw<{ date: Date; total: number }[]>`
        SELECT DATE("invoiceDate") as date, SUM("totalAmount") as total
        FROM "Sale"
        WHERE "businessId" = ${businessId}
          AND "status" != 'CANCELLED'
          AND "invoiceDate" >= ${start}
          AND "invoiceDate" <= ${end}
        GROUP BY DATE("invoiceDate")
        ORDER BY date ASC
      `
    ]);

    const formattedGraph = salesGraphData.map(d => ({
      name: new Date(d.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
      sales: Number(d.total)
    }));

    return {
      cards: {
        totalSale: totalSalesAgg._sum.totalAmount || 0,
        totalPurchase: totalPurchasesAgg._sum.totalAmount || 0,
        totalToCollect: totalReceivablesAgg._sum.balanceAmount || 0,
        totalToPay: totalPayablesAgg._sum.balanceDue || 0,
      },
      graphData: formattedGraph,
      recentActivity: {
        sales: recentSales.map(s => ({
          ...s,
          invoiceNumber: `${s.invoicePrefix}-${s.invoiceNo}`
        })),
        purchases: recentPurchases,
        // FIX 2: Explicitly cast 'o' to any to bypass TS inference issue on the 'include' property
        onlineOrders: recentOnlineOrders.map((o: any) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.customerUser?.name || 'Unknown',
          amount: o.totalAmount,
          status: o.status,
          date: o.createdAt
        }))
      }
    };
  }
    async getWaitlistAnalytics(businessId: string) {
    // 1. Get all pending waitlist entries for this business
    // We group them by Product and Variant to show "High Demand" items
    const demand = await this.prisma.productWaitlist.groupBy({
      by: ['productId', 'variantId'],
      where: {
        businessId,
        status: 'PENDING',
      },
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          productId: 'desc',
        },
      },
    });

    // 2. Enrich the data with Product and Variant names for the UI
    const enrichedDemand = await Promise.all(
      demand.map(async (item) => {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
          select: { title: true, images: true },
        });

        const variant = item.variantId
          ? await this.prisma.variant.findUnique({
              where: { id: item.variantId },
              select: { sku: true, price: true, stock: true },
            })
          : null;

        return {
          productId: item.productId,
          variantId: item.variantId,
          productTitle: product?.title,
          productImage: product?.images?.[0],
          sku: variant?.sku || 'Main Product',
          currentStock: variant?.stock || 0,
          waiterCount: item._count._all,
        };
      }),
    );

    return enrichedDemand;
  }

  async getBusinessTickets(businessId: string, query: SellerTicketQueryDto) {
    const { page = 1, limit = 10, status, priority } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SupportTicketWhereInput = {
      businessId,
      ...(status && { status }),
      ...(priority && { priority }),
    };

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastMessageAt: 'desc' }, // Most recently active first
        include: {
          customerUser: {
            select: { name: true, email: true, phoneNumber: true },
          },
          order: {
            select: { orderNumber: true, totalAmount: true },
          },
          _count: {
            select: { messages: true },
          },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return {
      data: tickets,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get specific ticket details + chat history
   */
  async getTicketDetails(businessId: string, ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        customerUser: {
          select: { id: true, name: true, email: true, picture: true },
        },
        order: {
          select: { 
            id: true, 
            orderNumber: true, 
            totalAmount: true, 
            status: true, 
            createdAt: true 
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { name: true } }, // Seller name
            customerUser: { select: { name: true } }, // Customer name
          },
        },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.businessId !== businessId) {
      throw new ForbiddenException('This ticket does not belong to your business.');
    }

    return ticket;
  }

  /**
   * Seller replies to a customer ticket
   */
  async replyToTicket(
    userId: string, // The Seller ID
    businessId: string,
    ticketId: string,
    dto: SellerReplyTicketDto,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket || ticket.businessId !== businessId) {
      throw new NotFoundException('Ticket not found or access denied.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Message
      const message = await tx.supportTicketMessage.create({
        data: {
          ticketId,
          senderType: 'SELLER',
          userId: userId, // Link to the staff/owner who replied
          message: dto.message,
          attachmentUrls: dto.attachmentUrls || [],
        },
      });

      // 2. Update Ticket (Set status to IN_PROGRESS if it was OPEN)
      await tx.supportTicket.update({
        where: { id: ticketId },
        data: {
          lastMessageAt: new Date(),
          status: ticket.status === 'OPEN' ? 'IN_PROGRESS' : undefined,
        },
      });

      // 3. Notify Customer
      await tx.customerNotification.create({
        data: {
          customerUserId: ticket.customerUserId,
          title: `Response on Ticket #${ticket.id.slice(0, 5)}`,
          message: `Seller replied: ${dto.message.substring(0, 40)}...`,
          type: 'SYSTEM', // Assuming 'SYSTEM' or 'ORDER' exists in NotificationType
          metadata: { ticketId: ticket.id },
        },
      });

      return message;
    });
  }

  /**
   * Update Status (e.g., Mark as Resolved)
   */
  async updateTicketStatus(
    businessId: string,
    ticketId: string,
    dto: UpdateTicketStatusDto,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket || ticket.businessId !== businessId) {
      throw new NotFoundException('Ticket not found.');
    }

    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: dto.status },
    });
  }

  /**
   * Dashboard Stats for Tickets
   */
  async getTicketStats(businessId: string) {
    const stats = await this.prisma.supportTicket.groupBy({
      by: ['status'],
      where: { businessId },
      _count: { id: true },
    });

    // Format for frontend
    const result = {
      OPEN: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      CLOSED: 0,
      TOTAL: 0,
    };

    stats.forEach((s) => {
      result[s.status] = s._count.id;
      result.TOTAL += s._count.id;
    });

    return result;
  }
}