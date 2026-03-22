import { Injectable, NotFoundException, ForbiddenException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SellerPaginationDto } from './dto/seller-pagination.dto';
import { BankCashCheque, OrderStatus, PaymentMethod, Prisma, PrismaClient } from '@prisma/client';
import { UpdateSellerOrderDto } from './dto/update-order.dtp';
import { CreatePosSaleDto, PosPaymentMode } from './dto/create-pos-sale.dto';
import { UpdatePosSaleDto } from './dto/update-pos-sale.dto';
import { PdfService } from './pdf.service';
import { SalePaginationDto } from './dto/sale-pagination.dto';
import { GetSalesStatsDto } from './dto/get-sales-stats.dto';
import { GetPosCustomersDto } from './dto/get-pos-customers.dto';
import { DashboardFilterDto } from './dto/dashboard-filter.dto';
import { SellerReplyTicketDto, SellerTicketQueryDto, UpdateTicketStatusDto } from './dto/seller-ticket.dto';
import { ITXClientDenyList } from '@prisma/client/runtime/library';

const PLATFORM_FEE = 4;
const SHIPPING_FEE = 40;
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

  // ─── HELPER 1: Parse tax rate string → number ────────────────────────────────
  // Handles: "18%", "18", "GST@18%", "0" → number
  private parseTaxRate(taxStr: string | null | undefined): number {
    if (!taxStr) return 0;
    const match = taxStr.match(/\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : 0;
  }

  // ─── HELPER 2: Build SaleTax rows grouped by HSN+rate ────────────────────────
  // CGST+SGST for intra-state, full IGST for inter-state
  private buildSaleTaxRows(
    saleId: string,
    items: Array<{
      hsnCode:       string;
      sacCode:       string;
      taxableAmount: Prisma.Decimal;
      taxAmount:     Prisma.Decimal;
      cessAmount:    Prisma.Decimal;
      tax:           string;
    }>,
    isInterState: boolean,
  ) {
    const groups = new Map<string, {
      hsnCode:       string;
      sacCode:       string;
      taxRate:       number;
      taxableAmount: Prisma.Decimal;
      taxAmount:     Prisma.Decimal;
      cessAmount:    Prisma.Decimal;
    }>();

    for (const item of items) {
      const rate = this.parseTaxRate(item.tax);
      const key  = `${item.hsnCode || item.sacCode || 'MISC'}__${rate}`;

      if (groups.has(key)) {
        const g       = groups.get(key)!;
        g.taxableAmount = g.taxableAmount.plus(item.taxableAmount);
        g.taxAmount     = g.taxAmount.plus(item.taxAmount);
        g.cessAmount    = g.cessAmount.plus(item.cessAmount);
      } else {
        groups.set(key, {
          hsnCode:       item.hsnCode,
          sacCode:       item.sacCode,
          taxRate:       rate,
          taxableAmount: item.taxableAmount,
          taxAmount:     item.taxAmount,
          cessAmount:    item.cessAmount,
        });
      }
    }

    return Array.from(groups.values()).map((g) => ({
      saleId,
      hsnCode:       g.hsnCode,
      sacCode:       g.sacCode,
      taxRate:       new Prisma.Decimal(g.taxRate),
      taxableAmount: g.taxableAmount,
      cgst: isInterState
        ? new Prisma.Decimal(0)
        : g.taxAmount.dividedBy(2).toDecimalPlaces(2),
      sgst: isInterState
        ? new Prisma.Decimal(0)
        : g.taxAmount.dividedBy(2).toDecimalPlaces(2),
      igst:  isInterState ? g.taxAmount : new Prisma.Decimal(0),
      cess:  g.cessAmount,
      total: g.taxableAmount.plus(g.taxAmount).plus(g.cessAmount).toDecimalPlaces(2),
    }));
  }

  // ─── HELPER 3: Upsert InvoiceSeries for GSTR-1 DOCS sheet ───────────────────
  private async upsertInvoiceSeries(
    tx: Omit<PrismaClient, ITXClientDenyList>,
    businessId:   string,
    documentType: string,
    prefix:       string,
    invoiceNo:    number,
  ) {
    const now         = new Date();
    const periodMonth = now.getMonth() + 1;
    const periodYear  = now.getFullYear();

    const existing = await tx.invoiceSeries.findFirst({
      where: { businessId, documentType, periodMonth, periodYear },
    });

    if (existing) {
      await tx.invoiceSeries.update({
        where: { id: existing.id },
        data:  {
          toNo:        Math.max(existing.toNo, invoiceNo),
          totalIssued: { increment: 1 },
        },
      });
    } else {
      await tx.invoiceSeries.create({
        data: {
          businessId,
          documentType,
          prefix,
          fromNo:         invoiceNo,
          toNo:           invoiceNo,
          totalIssued:    1,
          totalCancelled: 0,
          periodMonth,
          periodYear,
        },
      });
    }
  }

  /**
   * API 1: Get all orders for a specific business, with pagination and stats.
   */
async getBusinessOrders(businessId: string, query: SellerPaginationDto) {
  const { page = 1, limit = 10, status, paymentMethod, search } = query;
  const skip = (page - 1) * limit;

  const COMMISSION_PERCENT = 0;
  const TDS_RATE           = 0.01;
  const TCS_RATE           = 0.01;

  const where: Prisma.OrderWhereInput = {
    items: {
      some: { variant: { product: { businessId } } },
    },
    status:        status        ? { equals: status }                        : undefined,
    paymentMethod: paymentMethod ? { equals: paymentMethod }                 : undefined,
    orderNumber:   search        ? { contains: search, mode: 'insensitive' } : undefined,
  };

  const orders = await this.prisma.order.findMany({
    where,
    skip,
    take:    limit,
    orderBy: { createdAt: 'desc' },
    select: {
      id:            true,
      orderNumber:   true,
      createdAt:     true,
      status:        true,
      paymentMethod: true,
      customerUser:  { select: { name: true } },
      _count: {
        select: {
          items: { where: { variant: { product: { businessId } } } },
        },
      },
      items: {
        where: { variant: { product: { businessId } } },
        select: {
          priceAtTimeOfOrder: true,
          quantity:           true,
          variant: {
            select: {
              product: { select: { isCustomizable: true } },
            },
          },
        },
      },
    },
  });

  const [total, cod, online, delivered, pending] = await Promise.all([
    this.prisma.order.count({ where }),
    this.prisma.order.count({ where: { ...where, paymentMethod: PaymentMethod.cash_on_delivery } }),
    this.prisma.order.count({ where: { ...where, paymentMethod: PaymentMethod.online } }),
    this.prisma.order.count({ where: { ...where, status: OrderStatus.delivered } }),
    this.prisma.order.count({ where: { ...where, status: OrderStatus.pending } }),
  ]);

  const mappedOrders = orders.map(({ items, ...order }) => {
    const sellerSubtotal = parseFloat(
      items
        .reduce((sum, item) => sum + Number(item.priceAtTimeOfOrder) * item.quantity, 0)
        .toFixed(2),
    );
    const commissionAmt = parseFloat(((sellerSubtotal * COMMISSION_PERCENT) / 100).toFixed(2));
    const netBeforeTax  = parseFloat((sellerSubtotal - commissionAmt).toFixed(2));
    const tds           = parseFloat((netBeforeTax   * TDS_RATE).toFixed(2));
    const tcs           = parseFloat((sellerSubtotal * TCS_RATE).toFixed(2));
    const sellerPayout  = parseFloat((netBeforeTax - tds - tcs).toFixed(2));

    return {
      ...order,
      totalAmount:    sellerSubtotal,
      sellerPayout,
      isCustomizable: items.some((item) => item.variant?.product?.isCustomizable === true),
    };
  });

  return {
    orders: mappedOrders,
    stats: {
      totalOrders:          total,
      cashOnDeliveryOrders: cod,
      onlineOrders:         online,
      deliveredOrders:      delivered,
      pendingOrders:        pending,
    },
    pagination: {
      total,
      page,
      limit,
      lastPage: Math.ceil(total / limit),
    },
  };
}

  async getBusinessOrderById(businessId: string, orderId: string) {
  const COMMISSION_GST_RATE = 0.18;
  const TDS_RATE            = 0.01;
  const TCS_RATE            = 0.01;

  const order = await this.prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        where: { variant: { product: { businessId } } },
        include: {
          variant: {
            select: {
              sku:    true,
              images: true,
              attributeValues: {
                select: {
                  attribute:       { select: { name: true } },
                  attributeOption: { select: { value: true } },
                },
              },
              product: {
                select: {
                  title:          true,
                  isCustomizable: true,
                },
              },
            },
          },
        },
      },
      customerUser: {
        select: { name: true },
      },
    },
  });

  if (!order) {
    throw new NotFoundException(`Order with ID "${orderId}" not found.`);
  }

  if (order.items.length === 0) {
    throw new ForbiddenException(`You do not have permission to view this order.`);
  }

  const sellerSubtotal = parseFloat(
    order.items
      .reduce((sum, item) => sum + Number(item.priceAtTimeOfOrder) * item.quantity, 0)
      .toFixed(2),
  );

  const commissionPercent = 0;

  const commissionAmt  = parseFloat(((sellerSubtotal * commissionPercent) / 100).toFixed(2));
  const netBeforeTax   = parseFloat((sellerSubtotal - commissionAmt).toFixed(2));
  const tds            = parseFloat((netBeforeTax * TDS_RATE).toFixed(2));
  const tcs            = parseFloat((sellerSubtotal * TCS_RATE).toFixed(2));
  const sellerPayout   = parseFloat((netBeforeTax - tds - tcs).toFixed(2));
  const commissionGst  = parseFloat((commissionAmt * COMMISSION_GST_RATE).toFixed(2));
  const platformNet    = parseFloat((commissionAmt - commissionGst).toFixed(2));

  const { customerUser, ...restOfOrder } = order;

  return {
    id:            restOfOrder.id,
    orderNumber:   restOfOrder.orderNumber,
    status:        restOfOrder.status,
    paymentMethod: restOfOrder.paymentMethod,
    paymentStatus: restOfOrder.paymentStatus,
    createdAt:     restOfOrder.createdAt,
    customer: {
      name:            customerUser.name,
      shippingAddress: restOfOrder.selectedAddress,
    },
    items: restOfOrder.items.map((item) => ({
      productTitle: item.variant?.product?.title ?? null,
      sku:          item.variant?.sku             ?? null,
      image:        item.variant?.images?.[0]     ?? null,
      attributes:   item.variant?.attributeValues?.map((v) => ({
        name:  v.attribute.name,
        value: v.attributeOption.value,
      })) ?? [],
      price:    Number(item.priceAtTimeOfOrder),
      quantity: item.quantity,
      subtotal: Number(item.priceAtTimeOfOrder) * item.quantity,
      note:     item.note ?? null,
      isCustomizable:       item.variant?.product?.isCustomizable ?? false,
      customizationDetails: item.customizationDetails ?? null,
      customizationImages:  item.customizationImages  ?? [],
    })),
    financials: {
      sellerSubtotal,
      commissionPercent,
      commissionAmt,
      netBeforeTax,
      tds,
      tcs,
      sellerPayout,
      commissionGst,
      platformNet,
    },
  };
}

async updateOrderStatus(businessId: string, orderId: string, dto: UpdateSellerOrderDto) {
  return this.prisma.$transaction(async (tx) => {
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
          include: {
            variant: {
              select: {
                sku:     true,
                hsnCode: true,
                sacCode: true,                        // FIXED: needed for SaleTax.sacCode
                tax:     true,                        // FIXED: needed for tax rate computation
                product: { select: { title: true } }, // FIXED: needed for itemName
              },
            },
          },
        },
        customerUser: { select: { name: true } },
      },
    });

    if (!orderWithRelations) {
      throw new NotFoundException(`Order with ID "${orderId}" not found or it does not belong to your business.`);
    }

    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      pending:    [OrderStatus.processing, OrderStatus.cancelled],
      processing: [OrderStatus.shipped,    OrderStatus.cancelled],
      shipped:    [OrderStatus.delivered],
      delivered:  [],
      cancelled:  [],
    };

    const currentStatus = orderWithRelations.status;
    const nextStatus    = dto.status;

    if (currentStatus !== nextStatus) {
      if (nextStatus !== undefined) {
        const possibleNextStatuses = allowedTransitions[currentStatus];
        if (!possibleNextStatuses || !possibleNextStatuses.includes(nextStatus)) {
          throw new BadRequestException(`Invalid status transition from "${currentStatus}" to "${nextStatus}".`);
        }
      }
    }

    const dataToUpdate: Prisma.OrderUpdateInput = {
      status:                dto.status,
      trackingNumber:        dto.trackingNumber,
      cancellationReason:    dto.cancellationReason,
      estimatedDeliveryDate: dto.estimatedDeliveryDate,
    };

    if (dto.status) {
      switch (dto.status) {
        case OrderStatus.processing: dataToUpdate.confirmedAt = new Date(); break;
        case OrderStatus.shipped:    dataToUpdate.shippedAt   = new Date(); break;
        case OrderStatus.delivered:  dataToUpdate.deliveredAt = new Date(); break;
        case OrderStatus.cancelled:  dataToUpdate.cancelledAt = new Date(); break;
      }
    }

    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data:  dataToUpdate,
    });

    if (updatedOrder.status === OrderStatus.delivered && currentStatus !== OrderStatus.cancelled) {
      await this._createSaleFromOrder(tx, businessId, orderWithRelations);
    }

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
  order: any,
) {
  // ── Guard: Business ───────────────────────────────────────────────────────
  const business = await tx.business.findUnique({
    where:  { id: businessId },
    select: {
      name:     true,
      stateCode: true,
      gstState:  { select: { stateName: true } },
    },
  });
  if (!business) throw new InternalServerErrorException('Business not found during sale creation');

  // ── Guard: Duplicate ──────────────────────────────────────────────────────
  const existingSale = await tx.sale.findFirst({
    where: { notes: `From E-commerce Order #${order.orderNumber}` },
  });
  if (existingSale) {
    console.log(`Sale for order ${order.orderNumber} already exists. Skipping.`);
    return;
  }

  const address = order.selectedAddress as ShippingAddress;

  // ── Resolve placeOfSupplyCode from delivery address ───────────────────────
  const deliveryGstState = await tx.gstState.findFirst({
    where:  { stateName: { contains: address.state ?? '', mode: 'insensitive' } },
    select: { stateCode: true, stateName: true },
  });
  const placeOfSupplyCode = deliveryGstState?.stateCode ?? null;
  const placeOfSupply     = deliveryGstState?.stateName ?? address.state ?? '';
  const isInterState      =
    business.stateCode && placeOfSupplyCode
      ? business.stateCode !== placeOfSupplyCode
      : false;

  // ── Sequential invoice number ─────────────────────────────────────────────
  const lastSale = await tx.sale.findFirst({
    where:   { businessId },
    orderBy: { invoiceNo: 'desc' },
    select:  { invoiceNo: true },
  });
  const nextInvoiceNo = (lastSale?.invoiceNo ?? 0) + 1;

  // ── Build SaleItems + compute real tax ────────────────────────────────────
  let totalTaxableAmtDec = new Prisma.Decimal(0);
  let totalTaxAmountDec  = new Prisma.Decimal(0);
  let totalItemsAmtDec   = new Prisma.Decimal(0);

  const saleItemsForTax: Array<{
    hsnCode:       string;
    sacCode:       string;
    taxableAmount: Prisma.Decimal;
    taxAmount:     Prisma.Decimal;
    cessAmount:    Prisma.Decimal;
    tax:           string;
  }> = [];

  const saleItemsCreateData = order.items.map((item: any) => {
    const lineTotal = new Prisma.Decimal(item.priceAtTimeOfOrder).times(item.quantity);

    const taxRate = this.parseTaxRate(item.variant?.tax ?? '0');
    const divisor = new Prisma.Decimal(1).plus(
      new Prisma.Decimal(taxRate).dividedBy(100),
    );
    const taxableDec = lineTotal.dividedBy(divisor).toDecimalPlaces(2);
    const taxAmtDec  = lineTotal.minus(taxableDec).toDecimalPlaces(2);

    totalItemsAmtDec   = totalItemsAmtDec.plus(lineTotal);
    totalTaxableAmtDec = totalTaxableAmtDec.plus(taxableDec);
    totalTaxAmountDec  = totalTaxAmountDec.plus(taxAmtDec);

    const hsnCode = item.variant?.hsnCode ?? '';
    const sacCode = item.variant?.sacCode ?? '';
    const taxStr  = taxRate > 0 ? `${taxRate}%` : '0%';

    saleItemsForTax.push({
      hsnCode,
      sacCode,
      taxableAmount: taxableDec,
      taxAmount:     taxAmtDec,
      cessAmount:    new Prisma.Decimal(0),
      tax:           taxStr,
    });

    return {
      itemId:          item.variantId,
      itemName:        item.variant?.product?.title
                         ? `${item.variant.product.title} - ${item.variant.sku}`
                         : item.variant?.sku ?? 'Product',
      itemCode:        item.variant?.sku ?? '',
      hsnCode,
      sacCode,
      quantity:        new Prisma.Decimal(item.quantity),
      price:           new Prisma.Decimal(item.priceAtTimeOfOrder),
      taxableAmount:   taxableDec,
      amount:          lineTotal,
      tax:             taxStr,
      taxAmount:       taxAmtDec,
      itemDescription: '',
      batchNo:         '',
      manufactureDate: new Date(),
      expiryDate:      new Date(),
      priceType:       'MRP',
      unit:            'NOS',
      discountPercent: 0,
      discountAmount:  0,
      cess:            '',
      cessAmount:      0,
      isMrpEnabled:            false,
      isWholesaleEnabled:      false,
      isSerialisationEnabled:  false,
      isBatchingEnabled:       false,
      sellingPrice:            item.priceAtTimeOfOrder,
      sellingPriceType:        'MRP',
      purchasePrice:           0,
      purchasePriceType:       '',
      mrp:                     0,
      wholesalePrice:          0,
      wholesalePriceType:      '',
      wholesaleQuantity:       0,
    };
  });

  // ── Create Sale ───────────────────────────────────────────────────────────
  const newSale = await tx.sale.create({
    data: {
      businessId,
      partyId:                   null,
      partyName:                 order.customerUser?.name ?? 'Customer',
      businessName:              business.name,
      billingAddress:            `${address.street ?? ''}, ${address.city ?? ''}, ${address.state ?? ''} - ${address.postalCode ?? ''}`,
      shippingAddress:           `${address.street ?? ''}, ${address.city ?? ''}, ${address.state ?? ''} - ${address.postalCode ?? ''}`,
      phoneNo:                   address.alternativePhoneNumber ?? '',
      placeOfSupply:             placeOfSupply,
      placeOfSupplyCode:         placeOfSupplyCode,
      taxId:                     '',
      invoiceDate:               new Date(),
      invoiceNo:                 nextInvoiceNo,
      invoicePrefix:             'INV',
      totalTaxableAmount:        totalTaxableAmtDec,
      totalTaxAmount:            totalTaxAmountDec,
      totalAmount:               order.totalAmount,
      discountAmount:            order.discount ?? 0,
      notes:                     `From E-commerce Order #${order.orderNumber}`,
      status:                    'FINALIZED',
      isSettled:                 order.paymentMethod === 'online',
      balanceAmount:             order.paymentMethod === 'cash_on_delivery' ? order.totalAmount : 0,
      saleItems:                 { create: saleItemsCreateData },
      saleType:                  'ECOMMERCE',
      paymentTerm:               0,
      partyType:                 'Unregistered',
      panNo:                     '',
      isDiscountAfterTaxEnabled: false,
      discountPercent:           0,
      isAutoRoundoffEnabled:     false,
      roundoffType:              '',
      roundoffAmount:            0,
      termCondition:             '',
      isScanItemEnabled:         false,
      isConverted:               false,
      isDueDateEnabled:          false,
      dueDate:                   new Date(),
    },
  });

  // ── Create SaleTax rows ───────────────────────────────────────────────────
  const saleTaxRows = this.buildSaleTaxRows(newSale.id, saleItemsForTax, isInterState);
  if (saleTaxRows.length > 0) {
    await tx.saleTax.createMany({ data: saleTaxRows });
  }

  // ── Upsert InvoiceSeries ──────────────────────────────────────────────────
  await this.upsertInvoiceSeries(tx, businessId, 'TAX_INVOICE', 'INV', nextInvoiceNo);
}

async createPosSale(businessId: string, dto: CreatePosSaleDto) {
  const {
    customerName    = 'Walk-in Customer',
    customerPhone   = '',
    items,
    paymentMode     = PosPaymentMode.CASH,
    amountReceived,
    additionalCharges = [],
    gstin   = '',
    address = '',
    pan     = '',
    email   = '',
    depositAccountId,
  } = dto;

  // ── 0. Fetch Business ──────────────────────────────────────────────────────
  const business = await this.prisma.business.findUnique({
    where:  { id: businessId },
    select: {
      name:     true,
      stateCode: true,
      gstState:  { select: { stateName: true } },
    },
  });
  if (!business) throw new NotFoundException('Business not found');

  // POS = always intra-state (walk-in customer)
  const posPlaceOfSupplyCode = business.stateCode ?? null;
  const posPlaceOfSupply     = business.gstState?.stateName ?? '';
  const isInterState         = false;

  // ── 1. Fetch & Validate Variants ──────────────────────────────────────────
  const variantIds = items.map((i) => i.variantId);
  const variants   = await this.prisma.variant.findMany({
    where:   { id: { in: variantIds }, product: { businessId } },
    include: { product: { select: { title: true } } },
  });

  if (variants.length !== variantIds.length) {
    throw new BadRequestException('One or more items do not belong to your business.');
  }

  // ── 2. Build Sale Items ────────────────────────────────────────────────────
  let totalItemsAmountDec = new Prisma.Decimal(0);
  let totalTaxableAmtDec  = new Prisma.Decimal(0);
  let totalTaxAmountDec   = new Prisma.Decimal(0);

  const saleItemsData: Prisma.SaleItemCreateWithoutSaleInput[] = [];

  for (const item of items) {
    const variant = variants.find((v) => v.id === item.variantId);
    if (!variant) continue;

    if (variant.stock < item.quantity) {
      throw new BadRequestException(`Insufficient stock: ${variant.product.title}`);
    }

    const quantityDec  = new Prisma.Decimal(item.quantity);
    const priceDec     = new Prisma.Decimal(variant.price);
    const itemTotalDec = priceDec.times(quantityDec);

    // Parse real tax rate from variant.tax (e.g. "18%")
    const taxRate    = this.parseTaxRate(variant.tax);
    const divisor    = new Prisma.Decimal(1).plus(
      new Prisma.Decimal(taxRate).dividedBy(100),
    );

    // Back-calculate from tax-inclusive MRP price
    const taxableDec = itemTotalDec.dividedBy(divisor).toDecimalPlaces(2);
    const taxAmtDec  = itemTotalDec.minus(taxableDec).toDecimalPlaces(2);

    totalItemsAmountDec = totalItemsAmountDec.plus(itemTotalDec);
    totalTaxableAmtDec  = totalTaxableAmtDec.plus(taxableDec);
    totalTaxAmountDec   = totalTaxAmountDec.plus(taxAmtDec);

    saleItemsData.push({
      itemId:                  variant.id,
      itemName:                `${variant.product.title} - ${variant.sku}`,
      itemCode:                variant.sku,
      itemDescription:         variant.description || '',
      quantity:                quantityDec,
      price:                   priceDec,
      unit:                    variant.dimensionUnit || 'PCS',
      taxableAmount:           taxableDec,
      amount:                  itemTotalDec,
      hsnCode:                 variant.hsnCode || '',
      sacCode:                 variant.sacCode || '',
      batchNo:                 '',
      manufactureDate:         new Date(),
      expiryDate:              new Date(),
      priceType:               'MRP',
      discountPercent:         new Prisma.Decimal(0),
      discountAmount:          new Prisma.Decimal(0),
      tax:                     taxRate > 0 ? `${taxRate}%` : '0%',
      taxAmount:               taxAmtDec,
      cess:                    '',
      cessAmount:              new Prisma.Decimal(0),
      isMrpEnabled:            true,
      isWholesaleEnabled:      false,
      isSerialisationEnabled:  false,
      isBatchingEnabled:       false,
      sellingPrice:            priceDec,
      sellingPriceType:        'MRP',
      purchasePrice:           variant.purchasePrice   ?? new Prisma.Decimal(0),
      purchasePriceType:       'MRP',
      mrp:                     variant.mrp             ?? new Prisma.Decimal(0),
      wholesalePrice:          new Prisma.Decimal(0),
      wholesalePriceType:      '',
      wholesaleQuantity:       new Prisma.Decimal(0),
    });
  }

  // ── 3. Build Additional Charges ───────────────────────────────────────────
  let totalChargesDec = new Prisma.Decimal(0);
  const additionalChargesData: Prisma.SaleAdditionalChargeCreateWithoutSaleInput[] = [];

  for (const charge of additionalCharges) {
    const chargeAmount = new Prisma.Decimal(charge.amount);
    totalChargesDec    = totalChargesDec.plus(chargeAmount);
    additionalChargesData.push({ name: charge.name, amount: chargeAmount, tax: '0' });
  }

  // ── 4. Financials ─────────────────────────────────────────────────────────
  const grandTotalDec     = totalItemsAmountDec.plus(totalChargesDec);
  const amountReceivedDec = new Prisma.Decimal(amountReceived ?? 0);
  const balanceAmountDec  = grandTotalDec.minus(amountReceivedDec);
  const isSettled         = balanceAmountDec.lte(0);

  if (balanceAmountDec.greaterThan(0) && !customerPhone) {
    throw new BadRequestException('Customer phone number is required for credit sales.');
  }

  // ── 5. Transaction ────────────────────────────────────────────────────────
  return this.prisma.$transaction(async (tx) => {

    // ── 5a. Resolve Deposit Account ────────────────────────────────────────
    let targetAccount: BankCashCheque | null = null;

    if (depositAccountId) {
      targetAccount = await tx.bankCashCheque.findFirst({
        where: { id: depositAccountId, businessId, isEnabled: true },
      });
      if (!targetAccount) {
        throw new BadRequestException('Selected deposit account is invalid or disabled.');
      }
    } else {
      const accountTypeFilter =
        paymentMode === PosPaymentMode.CASH ? 'CASH' : { in: ['BANK', 'UPI'] };

      targetAccount = await tx.bankCashCheque.findFirst({
        where:   { businessId, accountType: accountTypeFilter as any, isEnabled: true },
        orderBy: { isDefault: 'desc' },
      });

      if (!targetAccount) {
        targetAccount = await tx.bankCashCheque.create({
          data: {
            businessId,
            accountName:    paymentMode === PosPaymentMode.CASH ? 'Cash Drawer' : 'Main Bank Account',
            accountType:    paymentMode === PosPaymentMode.CASH ? 'CASH' : 'BANK',
            isDefault:      true,
            isEnabled:      true,
            openingBalance: 0,
            closingBalance: 0,
          },
        });
      }
    }

    // ── 5b. Find or Create Party ────────────────────────────────────────────
    let partyId: string | null = null;

    if (customerPhone) {
      partyId = await this.findOrCreateParty(tx, businessId, {
        name:    customerName,
        phone:   customerPhone,
        email:   email   || null,
        gstin:   gstin   || null,
        address: address || null,
        pan:     pan     || null,
      });
    }

    // ── 5c. Sequential Invoice Number ──────────────────────────────────────
    const lastSale = await tx.sale.findFirst({
      where:   { businessId },
      orderBy: { invoiceNo: 'desc' },
      select:  { invoiceNo: true },
    });
    const nextInvoiceNo = (lastSale?.invoiceNo ?? 0) + 1;

    // ── 5d. Create Sale ────────────────────────────────────────────────────
    const newSale = await tx.sale.create({
      data: {
        businessId,
        businessName:              business.name,
        partyName:                 customerName,
        phoneNo:                   customerPhone,
        partyId:                   partyId,
        partyType:                 partyId ? 'Registered' : 'Unregistered',
        placeOfSupply:             posPlaceOfSupply,
        placeOfSupplyCode:         posPlaceOfSupplyCode,
        invoicePrefix:             'POS',
        invoiceNo:                 nextInvoiceNo,
        invoiceDate:               new Date(),
        isDueDateEnabled:          false,
        dueDate:                   new Date(),
        paymentTerm:               0,
        totalAmount:               grandTotalDec,
        totalTaxableAmount:        totalTaxableAmtDec,
        totalTaxAmount:            totalTaxAmountDec,
        balanceAmount:             balanceAmountDec.greaterThan(0) ? balanceAmountDec : new Prisma.Decimal(0),
        isSettled,
        status:                    'FINALIZED',
        isScanItemEnabled:         false,
        isConverted:               false,
        isDiscountAfterTaxEnabled: false,
        isAutoRoundoffEnabled:     false,
        notes:                     'POS Transaction',
        termCondition:             '',
        billingAddress:            address,
        shippingAddress:           address,
        taxId:                     gstin,
        panNo:                     pan,
        discountPercent:           new Prisma.Decimal(0),
        discountAmount:            new Prisma.Decimal(0),
        roundoffType:              '',
        roundoffAmount:            new Prisma.Decimal(0),
        saleType:                  paymentMode === PosPaymentMode.CASH ? 'CASH' : 'BANK',
        saleItems:                 { create: saleItemsData },
        saleAdditionalCharges:     { create: additionalChargesData },
        salePaymentModes:
          amountReceivedDec.greaterThan(0) && targetAccount
            ? {
                create: {
                  bankCashChequeId: targetAccount.id,
                  accountName:      targetAccount.accountName,
                  paymentMode:      paymentMode,
                  amount:           amountReceivedDec,
                  ifsc:             targetAccount.bankIfscCode  ?? '',
                  acNo:             targetAccount.bankAccountNo ?? '',
                },
              }
            : undefined,
      },
      include: { saleItems: true, saleAdditionalCharges: true },
    });

    // ── 5e. Create SaleTax rows ─────────────────────────────────────────────
    const saleTaxRows = this.buildSaleTaxRows(
      newSale.id,
      newSale.saleItems.map((si) => ({
        hsnCode:       si.hsnCode,
        sacCode:       si.sacCode,
        taxableAmount: si.taxableAmount,
        taxAmount:     si.taxAmount,
        cessAmount:    si.cessAmount,
        tax:           si.tax,
      })),
      isInterState,
    );
    if (saleTaxRows.length > 0) {
      await tx.saleTax.createMany({ data: saleTaxRows });
    }

    // ── 5f. Upsert InvoiceSeries ────────────────────────────────────────────
    await this.upsertInvoiceSeries(tx, businessId, 'TAX_INVOICE', 'POS', nextInvoiceNo);

    // ── 5g. Update Account Balance + Ledger ────────────────────────────────
    if (amountReceivedDec.greaterThan(0) && targetAccount) {
      await tx.bankCashCheque.update({
        where: { id: targetAccount.id },
        data:  { closingBalance: { increment: amountReceivedDec } },
      });

      await tx.bankCashChequeTransaction.create({
        data: {
          businessId,
          accountId:       targetAccount.id,
          transactionType: 'CREDIT',
          amount:          amountReceivedDec,
          runningBalance:  targetAccount.closingBalance.plus(amountReceivedDec),
          referenceId:     newSale.id,
          referenceType:   'SALE',
          invoiceNo:       `POS-${nextInvoiceNo}`,
          paymentMode:     paymentMode,
          partyName:       customerName,
          ...(partyId ? { partyId } : {}),
        },
      });
    }

    // ── 5h. Party Ledger ───────────────────────────────────────────────────
    if (balanceAmountDec.greaterThan(0) && partyId) {
      await tx.partyLedger.create({
        data: {
          businessId,
          partyId,
          partyType:       'CUSTOMER',
          partyName:       customerName,
          phoneNo:         customerPhone || null,
          email:           email         || null,
          gstin:           gstin         || null,
          transactionDate: new Date(),
          description:     `Credit Sale Inv #POS-${nextInvoiceNo}`,
          debit:           balanceAmountDec,
          credit:          new Prisma.Decimal(0),
          linkedSaleId:    newSale.id,
        },
      });

      await tx.party.update({
        where: { id: partyId },
        data:  { closingBalance: { increment: balanceAmountDec } },
      });
    }

    // ── 5i. Decrement Stock ────────────────────────────────────────────────
    for (const item of items) {
      await tx.variant.update({
        where: { id: item.variantId },
        data:  { stock: { decrement: item.quantity } },
      });
    }

    return newSale;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Find or Create a Party record scoped to THIS business
// ─────────────────────────────────────────────────────────────────────────────
private async findOrCreateParty(
  tx: Omit<PrismaClient, ITXClientDenyList>,
  businessId: string,
  customer: {
    name:    string;
    phone:   string;
    email:   string | null;
    gstin:   string | null;
    address: string | null;
    pan:     string | null;
  },
): Promise<string> {
  const existing = await tx.party.findFirst({
    where: { businessId, phoneNo: customer.phone, partyType: 'CUSTOMER' },
    select: { id: true },
  });

  if (existing) {
    await tx.party.update({
      where: { id: existing.id },
      data: {
        partyName: customer.name,
        ...(customer.email   ? { email:  customer.email  } : {}),
        ...(customer.gstin   ? { taxId:  customer.gstin  } : {}),
        ...(customer.pan     ? { panNo:  customer.pan    } : {}),
        ...(customer.address ? { billingAddress: { address: customer.address } } : {}),
      },
    });
    return existing.id;
  }

  const newParty = await tx.party.create({
    data: {
      businessId,
      partyType:             'CUSTOMER',
      partyCategory:         'RETAIL',
      partyName:             customer.name,
      isBusiness:            false,
      phoneNo:               customer.phone,
      email:                 customer.email   ?? null,
      taxId:                 customer.gstin   ?? null,
      panNo:                 customer.pan     ?? null,
      billingAddress:        customer.address ? { address: customer.address } : undefined,
      openingBalance:        0,
      openingBalanceType:    'DEBIT',
      closingBalance:        0,
      isEnabled:             true,
      isSynced:              false,
      isBillingShippingSame: true,
    },
    select: { id: true },
  });

  return newParty.id;
}

  async generateShippingLabelPdf(businessId: string, orderId: string, design: 'a4' | 'pos' = 'a4'): Promise<Buffer> {
    console.log(`[PDF] Starting generation for Order ID: ${orderId}, Design: ${design}`);

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
                    business: true,
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

    const belongsToSeller = order.items.some(item => item.variant?.product?.businessId === businessId);
    if (!belongsToSeller) {
      console.error(`[PDF] FORBIDDEN: User tried to access order ${orderId} not belonging to business ${businessId}.`);
      throw new ForbiddenException(`You do not have permission to generate a label for this order.`);
    }
    console.log('[PDF] ✅ Ownership verified.');

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

    let dateFrom: Date;
    let dateTo: Date;

    if (startDate || endDate) {
      dateFrom = startDate ? new Date(startDate) : new Date(0);
      dateTo   = endDate   ? new Date(endDate)   : new Date();
    } else {
      const today = new Date();
      dateTo      = new Date(today);
      const pastDate = new Date(today);
      pastDate.setDate(today.getDate() - 7);
      dateFrom = pastDate;
    }

    dateFrom.setHours(0, 0, 0, 0);
    dateTo.setHours(23, 59, 59, 999);

    const where: Prisma.SaleWhereInput = {
      businessId: businessId,
      invoiceDate: {
        gte: dateFrom,
        lte: dateTo,
      },
      ...(search && {
        OR: [
          { partyName:     { contains: search, mode: 'insensitive' } },
          { invoicePrefix: { contains: search, mode: 'insensitive' } },
          ...(Number(search) ? [{ invoiceNo: Number(search) }] : [])
        ],
      }),
    };

    const [sales, totalSales] = await this.prisma.$transaction([
      this.prisma.sale.findMany({
        where,
        skip,
        take: limit,
        orderBy: { invoiceDate: 'desc' },
        select: {
          id:            true,
          invoicePrefix: true,
          invoiceNo:     true,
          invoiceDate:   true,
          partyName:     true,
          totalAmount:   true,
          status:        true,
          isSettled:     true,
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
        total:    totalSales,
        page,
        limit,
        lastPage: Math.ceil(totalSales / limit),
      },
      dateRange: {
        from: dateFrom,
        to:   dateTo
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
      saleItems:             true,
      saleTaxes:             true,
      saleAdditionalCharges: true,
      salePaymentModes:      true,
      business:              true,
      party:                 true,
    },
  });

  if (!sale || sale.businessId !== businessId) {
    throw new NotFoundException(
      `Sale with ID "${saleId}" not found or does not belong to your business.`,
    );
  }

  return sale;
}

  async getSalesStats(businessId: string, query: GetSalesStatsDto) {
    const end   = query.to   ? new Date(query.to)   : new Date();
    const start = query.from ? new Date(query.from) : new Date(new Date().setDate(end.getDate() - 30));

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const whereCondition: Prisma.SaleWhereInput = {
      businessId: businessId,
      invoiceDate: {
        gte: start,
        lte: end,
      },
      status: { not: 'CANCELLED' }
    };

    const [aggregates, paymentModes, topProducts, timeline] = await Promise.all([

      this.prisma.sale.aggregate({
        where: whereCondition,
        _sum: {
          totalAmount:    true,
          totalTaxAmount: true,
          balanceAmount:  true,
        },
        _count: {
          id: true,
        },
      }),

      this.prisma.salePaymentMode.groupBy({
        by: ['paymentMode'],
        where: {
          sale: whereCondition,
        },
        _sum: {
          amount: true,
        },
      }),

      this.prisma.saleItem.groupBy({
        by: ['itemName', 'itemCode'],
        where: {
          sale: whereCondition,
        },
        _sum: {
          quantity: true,
          amount:   true,
        },
        orderBy: {
          _sum: {
            quantity: 'desc',
          },
        },
        take: 5,
      }),

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

    const totalRevenue = aggregates._sum.totalAmount || 0;
    const totalOrders  = aggregates._count.id        || 0;
    const avgOrderValue = totalOrders > 0 
      ? Number(totalRevenue) / totalOrders 
      : 0;

    return {
      meta: {
        from: start,
        to:   end,
      },
      summary: {
        totalRevenue:       totalRevenue,
        totalOrders:        totalOrders,
        totalTaxCollected:  aggregates._sum.totalTaxAmount || 0,
        outstandingBalance: aggregates._sum.balanceAmount  || 0,
        averageOrderValue:  avgOrderValue.toFixed(2),
      },
      paymentMethods: paymentModes.map(pm => ({
        method: pm.paymentMode,
        amount: pm._sum.amount || 0,
      })),
      topProducts: topProducts.map(p => ({
        name:             p.itemName,
        sku:              p.itemCode,
        quantitySold:     p._sum.quantity || 0,
        revenueGenerated: p._sum.amount   || 0,
      })),
      timeline: timeline.map(t => ({
        date:    t.date,
        revenue: t.total,
        orders:  Number(t.count),
      })),
    };
  }


async getPosProducts(businessId: string, search?: string) {
  const whereCondition: Prisma.ProductWhereInput = {
    businessId,
    deletedAt: null,
  };

  if (search && search.trim() !== '') {
    whereCondition.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      {
        variants: {
          some: {
            sku: { contains: search, mode: 'insensitive' },
            deletedAt: null,
          },
        },
      },
    ];
  }

  const [products, business] = await Promise.all([
    this.prisma.product.findMany({
      where:   whereCondition,
      take:    100,
      orderBy: { title: 'asc' },
      select: {
        id:     true,
        title:  true,
        images: true,
        // ── NEW: include category for gstRate ──
        category: {
          select: {
            id:      true,
            name:    true,
            gstRate: true,
          },
        },
        variants: {
          where: { deletedAt: null, status: 'ACTIVE' },
          select: {
            id:            true,
            sku:           true,
            price:         true,
            stock:         true,
            dimensionUnit: true,
            hsnCode:       true,
            attributeValues: {
              select: {
                attributeOption: { select: { value: true } },
              },
            },
          },
        },
      },
    }),

    this.prisma.business.findUnique({
      where:  { id: businessId },
      select: {
        name:                            true,
        authorizedSignatoryName:         true,
        authorizedSignatoryDesignation:  true,
        authorizedSignatorySignatureUrl: true,
      },
    }),
  ]);

  return {
    business: {
      name:           business?.name                            ?? '',
      signatoryName:  business?.authorizedSignatoryName         ?? null,
      signatoryTitle: business?.authorizedSignatoryDesignation  ?? null,
      signatureUrl:   business?.authorizedSignatorySignatureUrl ?? null,
    },
    products: products.map((p) => ({
      id:    p.id,
      title: p.title,
      image: p.images?.[0] ?? null,
      // ── NEW: category info ──
      category: p.category
        ? {
            id:      p.category.id,
            name:    p.category.name,
            gstRate: Number(p.category.gstRate ?? 0),
          }
        : null,
      variants: p.variants.map((v) => ({
        variantId:  v.id,
        sku:        v.sku,
        price:      Number(v.price),
        stock:      v.stock,
        unit:       v.dimensionUnit,
        hsnCode:    v.hsnCode ?? '',
        attributes: v.attributeValues
          .map((av) => av.attributeOption.value)
          .join(' / '),
        // ── NEW: gstRate from category ──
        gstRate: Number(p.category?.gstRate ?? 0),
      })),
    })),
  };
}


  async getPosCustomers(businessId: string, query: GetPosCustomersDto) {
  const { page = 1, limit = 10, search } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.PartyWhereInput = {
    businessId,
    partyType: 'CUSTOMER',
    ...(search
      ? {
          OR: [
            { partyName: { contains: search, mode: 'insensitive' } },
            { phoneNo:   { contains: search, mode: 'insensitive' } },
            { email:     { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [parties, total] = await this.prisma.$transaction([
    this.prisma.party.findMany({
      where,
      skip,
      take:    limit,
      orderBy: { partyName: 'asc' },
      select: {
        id:             true,
        partyName:      true,
        phoneNo:        true,
        email:          true,
        closingBalance: true,
        billingAddress: true,
        partyCategory:  true,
      },
    }),
    this.prisma.party.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data: parties.map((p) => ({
      id:       p.id,
      name:     p.partyName,
      phone:    p.phoneNo   ?? null,
      email:    p.email     ?? null,
      category: p.partyCategory ?? null,
      address:  p.billingAddress
        ? typeof p.billingAddress === 'string'
          ? p.billingAddress
          : (p.billingAddress as any)?.city
            ? `${(p.billingAddress as any).street ?? ''}, ${(p.billingAddress as any).city}`
            : null
        : null,
      balance: Number(p.closingBalance ?? 0),
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
  const existingSale = await this.prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      saleItems:             true,
      salePaymentModes:      true,
      saleAdditionalCharges: true,
    },
  });

  if (!existingSale || existingSale.businessId !== businessId) {
    throw new NotFoundException('Sale not found');
  }

  const variantIds = dto.items.map((i) => i.variantId);
  const variants   = await this.prisma.variant.findMany({
    where:   { id: { in: variantIds }, product: { businessId } },
    include: { product: { select: { title: true } } },
  });

  if (variants.length !== variantIds.length) {
    throw new BadRequestException('One or more items are invalid.');
  }

  return this.prisma.$transaction(async (tx) => {

    // ── A. REVERT OLD STATE ──────────────────────────────────────

    // A1. Revert Stock
    for (const oldItem of existingSale.saleItems) {
      await tx.variant.update({
        where: { id: oldItem.itemId },
        data:  { stock: { increment: Number(oldItem.quantity) } },
      });
    }

    // A2. Revert Shop Ledger
    if (existingSale.salePaymentModes.length > 0) {
      const oldPayment = existingSale.salePaymentModes[0];
      await tx.bankCashCheque.update({
        where: { id: oldPayment.bankCashChequeId },
        data:  { closingBalance: { decrement: oldPayment.amount } },
      });
      await tx.bankCashChequeTransaction.create({
        data: {
          businessId,
          accountId:       oldPayment.bankCashChequeId,
          transactionType: 'DEBIT',
          amount:          oldPayment.amount,
          runningBalance:  0,
          referenceId:     saleId,
          referenceType:   'SALE',
          invoiceNo:       `REV-${existingSale.invoicePrefix}-${existingSale.invoiceNo}`,
          partyName:       `Correction: ${existingSale.partyName}`,
          transactionNo:   'REVERSAL',
        },
      });
    }

    // A3. Revert Party Ledger
    if (Number(existingSale.balanceAmount) > 0 && existingSale.partyId) {
      try {
        await tx.partyLedger.deleteMany({ where: { linkedSaleId: saleId } });
      } catch {
        // safe to skip
      }
    }

    // A4. Delete Old Line Items + SaleTax rows
    await tx.saleItem.deleteMany({            where: { saleId } });
    await tx.saleAdditionalCharge.deleteMany({ where: { saleId } });
    await tx.salePaymentMode.deleteMany({     where: { saleId } });
    await tx.saleTax.deleteMany({             where: { saleId } }); // FIXED: clear old GST rows

    // ── B. CALCULATE NEW STATE ───────────────────────────────────

    let totalItemsDec      = new Prisma.Decimal(0);
    let totalTaxableAmtDec = new Prisma.Decimal(0); // FIXED
    let totalTaxAmountDec  = new Prisma.Decimal(0); // FIXED

    const saleItemsData: Prisma.SaleItemCreateWithoutSaleInput[] = [];

    for (const item of dto.items) {
      const variant = variants.find((v) => v.id === item.variantId);
      if (!variant) continue;

      const qty    = new Prisma.Decimal(item.quantity);
      const price  = new Prisma.Decimal(variant.price);
      const amount = price.times(qty);

      // FIXED: parse real tax rate
      const taxRate    = this.parseTaxRate(variant.tax);
      const divisor    = new Prisma.Decimal(1).plus(new Prisma.Decimal(taxRate).dividedBy(100));
      const taxableDec = amount.dividedBy(divisor).toDecimalPlaces(2);
      const taxAmtDec  = amount.minus(taxableDec).toDecimalPlaces(2);

      totalItemsDec      = totalItemsDec.plus(amount);
      totalTaxableAmtDec = totalTaxableAmtDec.plus(taxableDec); // FIXED
      totalTaxAmountDec  = totalTaxAmountDec.plus(taxAmtDec);   // FIXED

      saleItemsData.push({
        itemId:              variant.id,
        itemName:            `${variant.product.title} - ${variant.sku}`,
        itemCode:            variant.sku,
        quantity:            qty,
        price,
        amount,
        taxableAmount:       taxableDec,                          // FIXED
        unit:                variant.dimensionUnit || 'PCS',
        hsnCode:             variant.hsnCode       || '',
        sacCode:             variant.sacCode       || '',         // FIXED
        itemDescription:     '',
        batchNo:             '',
        manufactureDate:     new Date(),
        expiryDate:          new Date(),
        priceType:           'MRP',
        discountPercent:     0,
        discountAmount:      0,
        tax:                 taxRate > 0 ? `${taxRate}%` : '0%', // FIXED
        taxAmount:           taxAmtDec,                           // FIXED
        cess:                '',
        cessAmount:          0,
        isMrpEnabled:        true,
        isWholesaleEnabled:  false,
        isSerialisationEnabled: false,
        isBatchingEnabled:   false,
        sellingPrice:        price,
        sellingPriceType:    'MRP',
        purchasePrice:       0,
        purchasePriceType:   'MRP',
        mrp:                 0,
        wholesalePrice:      0,
        wholesalePriceType:  '',
        wholesaleQuantity:   0,
      });
    }

    let totalChargesDec = new Prisma.Decimal(0);
    const chargesData: Prisma.SaleAdditionalChargeCreateWithoutSaleInput[] = [];

    for (const ch of (dto.additionalCharges ?? [])) {
      const amt       = new Prisma.Decimal(ch.amount);
      totalChargesDec = totalChargesDec.plus(amt);
      chargesData.push({ name: ch.name, amount: amt, tax: '0' });
    }

    const grandTotal = totalItemsDec.plus(totalChargesDec);
    const received   = new Prisma.Decimal(dto.amountReceived ?? 0);
    const balance    = grandTotal.minus(received);
    const isSettled  = balance.lte(0);

    // ── C. APPLY NEW STATE ───────────────────────────────────────

    // C1. Update Sale Header
    const updatedSale = await tx.sale.update({
      where: { id: saleId },
      data: {
        partyName:          dto.customerName  ?? existingSale.partyName,
        phoneNo:            dto.customerPhone ?? existingSale.phoneNo,
        billingAddress:     dto.address       ?? existingSale.billingAddress,
        taxId:              dto.gstin         ?? existingSale.taxId,
        panNo:              dto.pan           ?? existingSale.panNo,
        totalAmount:        grandTotal,
        totalTaxableAmount: totalTaxableAmtDec, // FIXED
        totalTaxAmount:     totalTaxAmountDec,  // FIXED
        balanceAmount:      balance.greaterThan(0) ? balance : new Prisma.Decimal(0),
        isSettled,
        status:             'FINALIZED',
        saleItems:          { create: saleItemsData },
        saleAdditionalCharges: { create: chargesData },
      },
    });

    // FIXED: Recreate SaleTax rows
    const saleTaxRows = this.buildSaleTaxRows(
      saleId,
      saleItemsData.map((si) => ({
        hsnCode:       si.hsnCode       as string,
        sacCode:       si.sacCode       as string,
        taxableAmount: si.taxableAmount as Prisma.Decimal,
        taxAmount:     si.taxAmount     as Prisma.Decimal,
        cessAmount:    si.cessAmount    as Prisma.Decimal,
        tax:           si.tax           as string,
      })),
      false, // POS = always intra-state
    );
    if (saleTaxRows.length > 0) {
      await tx.saleTax.createMany({ data: saleTaxRows });
    }

    // C2. Payment Mode + Ledger
    if (received.greaterThan(0)) {
      let targetAccount = dto.depositAccountId
        ? await tx.bankCashCheque.findFirst({ where: { id: dto.depositAccountId } })
        : await tx.bankCashCheque.findFirst({
            where: {
              businessId,
              accountType: dto.paymentMode === 'CASH' ? 'CASH' : { in: ['BANK', 'UPI'] },
              isEnabled:   true,
            },
          });

      if (targetAccount) {
        await tx.bankCashCheque.update({
          where: { id: targetAccount.id },
          data:  { closingBalance: { increment: received } },
        });
        await tx.bankCashChequeTransaction.create({
          data: {
            businessId,
            accountId:       targetAccount.id,
            transactionType: 'CREDIT',
            amount:          received,
            runningBalance:  0,
            referenceId:     saleId,
            referenceType:   'SALE',
            invoiceNo:       `UPD-${updatedSale.invoiceNo}`,
            partyName:       dto.customerName ?? 'Walk-in Customer',
          },
        });
        await tx.salePaymentMode.create({
          data: {
            saleId,
            bankCashChequeId: targetAccount.id,
            accountName:      targetAccount.accountName,
            paymentMode:      dto.paymentMode ?? 'CASH',
            amount:           received,
            ifsc:             '',
            acNo:             '',
          },
        });
      }
    }

    // C3. Party Ledger — only if balance due and party linked
    if (balance.greaterThan(0) && existingSale.partyId) {
      await tx.partyLedger.create({
        data: {
          businessId,
          partyType:       'CUSTOMER',
          partyId:         existingSale.partyId,
          partyName:       dto.customerName ?? existingSale.partyName,
          transactionDate: new Date(),
          description:     `Updated Inv #${updatedSale.invoiceNo}`,
          debit:           balance,
          credit:          new Prisma.Decimal(0),
          linkedSaleId:    saleId,
        },
      });
    }

    // C4. Deduct New Stock
    for (const item of dto.items) {
      await tx.variant.update({
        where: { id: item.variantId },
        data:  { stock: { decrement: item.quantity } },
      });
    }

    return updatedSale;
  });
}


  async verifyBusinessOwnership(userId: string, businessId: string) {
    const business = await this.prisma.business.findUnique({
      where:  { id: businessId },
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
    const end   = query.endDate   ? new Date(query.endDate)   : new Date();
    const start = query.startDate ? new Date(query.startDate) : new Date();

    if (!query.startDate) {
      start.setDate(end.getDate() - 30);
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

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

      this.prisma.sale.aggregate({
        where: { 
          businessId, 
          status:      { not: 'CANCELLED' },
          invoiceDate: { gte: start, lte: end } 
        },
        _sum: { totalAmount: true }
      }),

      this.prisma.purchase.aggregate({
        where: { 
          businessId, 
          status:            { not: 'CANCELLED' },
          purchaseOrderDate: { gte: start, lte: end } 
        },
        _sum: { totalAmount: true }
      }),

      this.prisma.sale.aggregate({
        where: { 
          businessId, 
          status:        { not: 'CANCELLED' },
          isSettled:     false,
          balanceAmount: { gt: 0 }
        },
        _sum: { balanceAmount: true }
      }),

      this.prisma.purchase.aggregate({
        where: { 
          businessId, 
          status:     { not: 'CANCELLED' },
          balanceDue: { gt: 0 }
        },
        _sum: { balanceDue: true }
      }),

      this.prisma.sale.findMany({
        where:   { businessId },
        orderBy: { createdAt: 'desc' },
        take:    5,
        select: {
          id:            true,
          invoiceNo:     true,
          invoicePrefix: true,
          partyName:     true,
          totalAmount:   true,
          status:        true,
          invoiceDate:   true
        }
      }),

      this.prisma.purchase.findMany({
        where:   { businessId },
        orderBy: { createdAt: 'desc' },
        take:    5,
        select: {
          id:                true,
          purchaseOrderNo:   true,
          supplierName:      true,
          totalAmount:       true,
          status:            true,
          purchaseOrderDate: true
        }
      }),

      this.prisma.order.findMany({
        where:   { items: { some: { variant: { product: { businessId } } } } },
        orderBy: { createdAt: 'desc' },
        take:    5,
        include: { customerUser: { select: { name: true } } }
      }),

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
      name:  new Date(d.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
      sales: Number(d.total)
    }));

    return {
      cards: {
        totalSale:      totalSalesAgg._sum.totalAmount      || 0,
        totalPurchase:  totalPurchasesAgg._sum.totalAmount  || 0,
        totalToCollect: totalReceivablesAgg._sum.balanceAmount || 0,
        totalToPay:     totalPayablesAgg._sum.balanceDue    || 0,
      },
      graphData: formattedGraph,
      recentActivity: {
        sales: recentSales.map(s => ({
          ...s,
          invoiceNumber: `${s.invoicePrefix}-${s.invoiceNo}`
        })),
        purchases: recentPurchases,
        onlineOrders: recentOnlineOrders.map((o: any) => ({
          id:           o.id,
          orderNumber:  o.orderNumber,
          customerName: o.customerUser?.name || 'Unknown',
          amount:       o.totalAmount,
          status:       o.status,
          date:         o.createdAt
        }))
      }
    };
  }

    async getWaitlistAnalytics(businessId: string) {
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

    const enrichedDemand = await Promise.all(
      demand.map(async (item) => {
        const product = await this.prisma.product.findUnique({
          where:  { id: item.productId },
          select: { title: true, images: true },
        });

        const variant = item.variantId
          ? await this.prisma.variant.findUnique({
              where:  { id: item.variantId },
              select: { sku: true, price: true, stock: true },
            })
          : null;

        return {
          productId:    item.productId,
          variantId:    item.variantId,
          productTitle: product?.title,
          productImage: product?.images?.[0],
          sku:          variant?.sku || 'Main Product',
          currentStock: variant?.stock || 0,
          waiterCount:  item._count._all,
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
      ...(status   && { status }),
      ...(priority && { priority }),
    };

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { lastMessageAt: 'desc' },
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
            id:          true, 
            orderNumber: true, 
            totalAmount: true, 
            status:      true, 
            createdAt:   true 
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            user:         { select: { name: true } },
            customerUser: { select: { name: true } },
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
    userId: string,
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
      const message = await tx.supportTicketMessage.create({
        data: {
          ticketId,
          senderType:     'SELLER',
          userId:         userId,
          message:        dto.message,
          attachmentUrls: dto.attachmentUrls || [],
        },
      });

      await tx.supportTicket.update({
        where: { id: ticketId },
        data: {
          lastMessageAt: new Date(),
          status: ticket.status === 'OPEN' ? 'IN_PROGRESS' : undefined,
        },
      });

      await tx.customerNotification.create({
        data: {
          customerUserId: ticket.customerUserId,
          title:          `Response on Ticket #${ticket.id.slice(0, 5)}`,
          message:        `Seller replied: ${dto.message.substring(0, 40)}...`,
          type:           'SYSTEM',
          metadata:       { ticketId: ticket.id },
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
      data:  { status: dto.status },
    });
  }

  /**
   * Dashboard Stats for Tickets
   */
  async getTicketStats(businessId: string) {
    const stats = await this.prisma.supportTicket.groupBy({
      by:    ['status'],
      where: { businessId },
      _count: { id: true },
    });

    const result = {
      OPEN:        0,
      IN_PROGRESS: 0,
      RESOLVED:    0,
      CLOSED:      0,
      TOTAL:       0,
    };

    stats.forEach((s) => {
      result[s.status] = s._count.id;
      result.TOTAL    += s._count.id;
    });

    return result;
  }
}
