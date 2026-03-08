import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { ConvertQuotationDto } from './dto/convert-quotation.dto';
import { Prisma, QuotationStatus } from '@prisma/client';

@Injectable()
export class QuotationService {
  constructor(private readonly prisma: PrismaService) {}

  // ── 1. CREATE ──────────────────────────────────────────────────────────────

  async create(businessId: string, userId: string, dto: CreateQuotationDto) {
    const { items, customerPhone } = dto;

    const variantIds = items.map((i) => i.variantId);
    const variants   = await this.prisma.variant.findMany({
      where:   { id: { in: variantIds }, product: { businessId } },
      include: { product: true },
    });

    if (variants.length !== variantIds.length) {
      throw new BadRequestException('One or more items are invalid.');
    }

    let totalAmount  = new Prisma.Decimal(0);
    const itemsData: Prisma.QuotationItemCreateWithoutQuotationInput[] = [];

    for (const item of items) {
      const variant = variants.find((v) => v.id === item.variantId);
      if (!variant) throw new BadRequestException(`Variant ${item.variantId} not found`);

      const price  = item.customPrice ? new Prisma.Decimal(item.customPrice) : variant.price;
      const amount = price.times(item.quantity);
      totalAmount  = totalAmount.plus(amount);

      itemsData.push({
        variantId: variant.id,
        itemName:  `${variant.product.title} - ${variant.sku}`,
        quantity:  item.quantity,   // Int — no Decimal needed
        price,
        taxAmount: 0,
        amount,
      });
    }

    // Sequential quotation number
    const lastQuote = await this.prisma.quotation.findFirst({
      where:   { businessId },
      orderBy: { createdAt: 'desc' },
      select:  { quotationNo: true },
    });
    const lastNum   = lastQuote ? parseInt(lastQuote.quotationNo.split('-')[1] ?? '1000', 10) : 1000;
    const quotationNo = `QT-${lastNum + 1}`;

    // Resolve customer
    let customerUserId: string | null = null;
    if (customerPhone) {
      const customer = await this.findOrCreateCustomer(customerPhone, dto.customerName);
      customerUserId = customer.id;
    }

    const quotation = await this.prisma.quotation.create({
      data: {
        businessId,
        quotationNo,
        date:          new Date(),
        validUntil:    new Date(dto.validUntil),
        partyName:     dto.customerName || 'Walk-in Customer',
        partyPhone:    customerPhone    ?? null,
        customerUserId,
        totalAmount,
        status:        'PENDING',
        items:         { create: itemsData },
      },
      include: { items: true },
    });

    await this.logHistory(businessId, userId, 'CREATE_QUOTATION', quotation.id, `Created Quotation ${quotationNo}`);
    return quotation;
  }

  // ── 2. GET ALL ─────────────────────────────────────────────────────────────

  async findAll(businessId: string, page: number, limit: number, status?: QuotationStatus) {
    const skip  = (page - 1) * limit;

    // Only add status to where if it's actually provided
    const where: Prisma.QuotationWhereInput = {
      businessId,
      ...(status ? { status } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.quotation.findMany({
        where,
        skip,
        take:     limit,
        orderBy:  { createdAt: 'desc' },
        include:  { items: true },
      }),
      this.prisma.quotation.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── 3. GET ONE ─────────────────────────────────────────────────────────────

  async findOne(businessId: string, id: string) {
    const quote = await this.prisma.quotation.findFirst({
      where:   { id, businessId },
      include: { items: true },
    });
    if (!quote) throw new NotFoundException('Quotation not found');
    return quote;
  }

  // ── 4. GET ONE WITH BUSINESS (for PDF) ────────────────────────────────────

  async findOneWithBusiness(businessId: string, id: string) {
    const quote = await this.prisma.quotation.findFirst({
      where:   { id, businessId },
      include: { items: true, business: true },
    });
    if (!quote) throw new NotFoundException('Quotation not found');
    return quote;
  }

  // ── 5. UPDATE ──────────────────────────────────────────────────────────────

  async update(businessId: string, userId: string, id: string, dto: UpdateQuotationDto) {
    const quote = await this.findOne(businessId, id);
    if (quote.status === 'CONVERTED') {
      throw new BadRequestException('Cannot update a converted quotation.');
    }

    const updated = await this.prisma.quotation.update({
      where: { id },
      data: {
        partyName:  dto.customerName  ?? undefined,
        partyPhone: dto.customerPhone ?? undefined,
        validUntil: dto.validUntil    ? new Date(dto.validUntil) : undefined,
        status:     dto.status        ?? undefined,
      },
      include: { items: true },
    });

    await this.logHistory(businessId, userId, 'UPDATE_QUOTATION', id, 'Updated Quotation details');
    return updated;
  }

  // ── 6. DELETE ──────────────────────────────────────────────────────────────

  async remove(businessId: string, userId: string, id: string) {
    const quote = await this.findOne(businessId, id);
    if (quote.status === 'CONVERTED') {
      throw new BadRequestException('Cannot delete a converted quotation.');
    }

    await this.prisma.quotation.delete({ where: { id } });
    await this.logHistory(businessId, userId, 'DELETE_QUOTATION', id, `Deleted Quotation ${quote.quotationNo}`);
    return { success: true, message: `Quotation ${quote.quotationNo} deleted.` };
  }

  // ── 7. CONVERT TO SALE ─────────────────────────────────────────────────────

  async convertToSale(businessId: string, userId: string, id: string, dto: ConvertQuotationDto) {
    return this.prisma.$transaction(async (tx) => {
      // A. Fetch quote with items
      const quote = await tx.quotation.findFirst({
        where:   { id, businessId },
        include: { items: true },
      });
      if (!quote)                       throw new NotFoundException('Quotation not found');
      if (quote.status === 'CONVERTED') throw new BadRequestException('Already converted.');

      // B. Generate invoice number (safe Int range)
      const lastSale = await tx.sale.findFirst({
        where:   { businessId },
        orderBy: { invoiceNo: 'desc' },
        select:  { invoiceNo: true },
      });
      const nextInvoiceNo = (lastSale?.invoiceNo ?? 1000) + 1;

      // C. Validate stock & build sale items
      const saleItemsData: Prisma.SaleItemCreateWithoutSaleInput[] = [];

      for (const qItem of quote.items) {
        if (!qItem.variantId) continue;

        const variant = await tx.variant.findUnique({
          where:   { id: qItem.variantId },
          include: { product: true },
        });

        if (!variant) {
          throw new BadRequestException(`Variant for item "${qItem.itemName}" not found.`);
        }
        if (variant.stock < qItem.quantity) {
          throw new BadRequestException(`Insufficient stock for "${qItem.itemName}". Available: ${variant.stock}`);
        }

        saleItemsData.push({
          itemId:          variant.id,
          itemName:        qItem.itemName,
          itemCode:        variant.sku,
          quantity:        new Prisma.Decimal(qItem.quantity),
          price:           qItem.price,
          amount:          qItem.amount,
          taxableAmount:   qItem.amount,
          hsnCode:         variant.hsnCode          || '',
          unit:            variant.dimensionUnit     || 'PCS',
          priceType:       'FIXED',
          tax:             '0',
          taxAmount:       0,
          sellingPrice:    qItem.price,
          sellingPriceType:'FIXED',
          itemDescription: '',
          sacCode:         '',
          batchNo:         '',
          manufactureDate: new Date(),
          expiryDate:      new Date(),
          discountPercent: 0,
          discountAmount:  0,
          cess:            '',
          cessAmount:      0,
          isMrpEnabled:          false,
          isWholesaleEnabled:    false,
          isSerialisationEnabled:false,
          isBatchingEnabled:     false,
          purchasePrice:         0,
          purchasePriceType:     '',
          mrp:                   0,
          wholesalePrice:        0,
          wholesalePriceType:    '',
          wholesaleQuantity:     0,
        });

        await tx.variant.update({
          where: { id: variant.id },
          data:  { stock: { decrement: qItem.quantity } },
        });
      }

      // D. Create Sale
      const sale = await tx.sale.create({
        data: {
          businessId,
          partyId:            null,               // Party model relation — not linked from Quotation
          partyType:          'UNREGISTERED',
          partyName:          quote.partyName,
          phoneNo:            quote.partyPhone    || '',
          invoicePrefix:      'INV',
          invoiceNo:          nextInvoiceNo,
          invoiceDate:        new Date(),
          totalAmount:        quote.totalAmount,
          totalTaxableAmount: quote.totalAmount,
          totalTaxAmount:     new Prisma.Decimal(0),
          balanceAmount:      new Prisma.Decimal(0),
          isSettled:          true,
          status:             'FINALIZED',
          saleItems:          { create: saleItemsData },

          // Required schema fields
          saleType:                   'CASH',
          placeOfSupply:              '',
          businessName:               '',
          billingAddress:             '',
          shippingAddress:            '',
          taxId:                      '',
          panNo:                      '',
          roundoffType:               '',
          roundoffAmount:             new Prisma.Decimal(0),
          termCondition:              '',
          notes:                      `Converted from Quotation ${quote.quotationNo}`,
          isDueDateEnabled:           false,
          dueDate:                    new Date(),
          paymentTerm:                0,
          discountAmount:             new Prisma.Decimal(0),
          discountPercent:            new Prisma.Decimal(0),
          isDiscountAfterTaxEnabled:  false,
          isAutoRoundoffEnabled:      false,
          isScanItemEnabled:          false,
          isConverted:                true,
        },
      });

      // E. Handle payment recording if deposit account provided
      if (dto.depositAccountId) {
        const account = await tx.bankCashCheque.findFirst({
          where: { id: dto.depositAccountId, businessId },
        });
        if (account) {
          await tx.bankCashCheque.update({
            where: { id: account.id },
            data:  { closingBalance: { increment: quote.totalAmount } },
          });
          await tx.bankCashChequeTransaction.create({
            data: {
              businessId,
              accountId:       account.id,
              transactionType: 'CREDIT',
              amount:          quote.totalAmount,
              runningBalance:  0,
              referenceId:     sale.id,
              referenceType:   'SALE',
              invoiceNo:       `INV-${nextInvoiceNo}`,
              partyName:       quote.partyName,
            },
          });
          await tx.salePaymentMode.create({
            data: {
              saleId:           sale.id,
              bankCashChequeId: account.id,
              accountName:      account.accountName,
              paymentMode:      dto.paymentMode || 'CASH',
              amount:           quote.totalAmount,
              ifsc:             '',
              acNo:             '',
            },
          });
        }
      }

      // F. Mark quotation as converted
      await tx.quotation.update({
        where: { id },
        data:  { status: 'CONVERTED', convertedSaleId: sale.id },
      });

      // G. Audit log
      await tx.activityLog.create({
        data: {
          businessId,
          performedByUserId: userId,
          actionType:        'CONVERT_QUOTE',
          entityType:        'Quotation',
          entityId:          id,
          description:       `Converted Quotation ${quote.quotationNo} → Sale INV-${nextInvoiceNo}`,
        },
      });

      return sale;
    });
  }

  // ── 8. GET HISTORY ─────────────────────────────────────────────────────────

  async getHistory(businessId: string, id: string) {
    return this.prisma.activityLog.findMany({
      where:   { businessId, entityId: id, entityType: 'Quotation' },
      orderBy: { createdAt: 'desc' },
      include: { performedByUser: { select: { name: true, email: true } } },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async logHistory(
    businessId: string,
    userId:     string,
    action:     string,
    entityId:   string,
    desc:       string,
  ) {
    await this.prisma.activityLog.create({
      data: {
        businessId,
        performedByUserId: userId,
        actionType:        action,
        entityType:        'Quotation',
        entityId,
        description:       desc,
      },
    });
  }

  private async findOrCreateCustomer(phone: string, name?: string) {
    let user = await this.prisma.customerUser.findUnique({
      where: { phoneNumber: phone },
    });
    if (!user) {
      user = await this.prisma.customerUser.create({
        data: {
          phoneNumber: phone,
          name:        name  || 'Unknown',
          email:       `${phone}@pos.local`,
          authSource:  'self',
          type:        'user',
        },
      });
    }
    return user;
  }
}
