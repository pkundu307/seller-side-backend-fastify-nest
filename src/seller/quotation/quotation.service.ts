import { 
  BadRequestException, 
  Injectable, 
  NotFoundException 
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { ConvertQuotationDto } from './dto/convert-quotation.dto';
import { Prisma, QuotationStatus } from '@prisma/client';

@Injectable()
export class QuotationService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. CREATE QUOTATION
  async create(businessId: string, userId: string, dto: CreateQuotationDto) {
    const { items, customerPhone } = dto;

    // A. Fetch Products
    const variantIds = items.map(i => i.variantId);
    const variants = await this.prisma.variant.findMany({
      where: { id: { in: variantIds }, product: { businessId } },
      include: { product: true }
    });

    if (variants.length !== variantIds.length) throw new BadRequestException("Invalid items.");

    // B. Calculate Totals (No Stock Deduction)
    let totalAmount = new Prisma.Decimal(0);
    const quotationItemsData: Prisma.QuotationItemCreateWithoutQuotationInput[] = [];

    // FIX: Use for...of loop or ensure variant exists to satisfy TS
    for (const item of items) {
      const variant = variants.find(v => v.id === item.variantId);
      
      // FIX 1 & 2: Guard clause against undefined variant
      if (!variant) {
        throw new BadRequestException(`Variant ${item.variantId} not found`);
      }

      const price = item.customPrice ? new Prisma.Decimal(item.customPrice) : variant.price;
      const amount = price.times(item.quantity);
      
      totalAmount = totalAmount.plus(amount);

      quotationItemsData.push({
        variantId: variant.id,
        itemName: `${variant.product.title} - ${variant.sku}`,
        quantity: item.quantity,
        price: price,
        taxAmount: 0, 
        amount: amount
      });
    }

    // C. Generate ID
    const lastQuote = await this.prisma.quotation.findFirst({
      where: { businessId }, orderBy: { createdAt: 'desc' }
    });
    const nextNum = lastQuote ? parseInt(lastQuote.quotationNo.split('-')[1] || '1000') + 1 : 1001;
    const quotationNo = `QT-${nextNum}`;

    // D. Resolve Customer
    // FIX 3: Explicitly type as string | null
    let customerUserId: string | null = null;
    
    if (customerPhone) {
      const customer = await this.findOrCreateCustomer(customerPhone, dto.customerName);
      customerUserId = customer.id;
    }

    // E. Save
    const quotation = await this.prisma.quotation.create({
      data: {
        businessId,
        quotationNo,
        date: new Date(),
        validUntil: new Date(dto.validUntil),
        partyName: dto.customerName || 'Unknown',
        partyPhone: customerPhone,
        customerUserId,
        totalAmount,
        status: 'PENDING',
        items: { create: quotationItemsData }
      }
    });

    // F. Add History (Audit Log)
    await this.logHistory(businessId, userId, 'CREATE_QUOTATION', quotation.id, `Created Quotation ${quotationNo}`);

    return quotation;
  }

  // 2. GET ALL
  async findAll(businessId: string, page: number, limit: number, status?: QuotationStatus) {
    const skip = (page - 1) * limit;
    const where: Prisma.QuotationWhereInput = { businessId, status };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.quotation.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true }
      }),
      this.prisma.quotation.count({ where })
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  // 3. GET ONE
  async findOne(businessId: string, id: string) {
    const quote = await this.prisma.quotation.findFirst({
      where: { id, businessId },
      include: { items: true }
    });
    if (!quote) throw new NotFoundException("Quotation not found");
    return quote;
  }

  // 4. UPDATE
  async update(businessId: string, userId: string, id: string, dto: UpdateQuotationDto) {
    const quote = await this.findOne(businessId, id);
    if (quote.status === 'CONVERTED') throw new BadRequestException("Cannot update a converted quotation.");

    const updated = await this.prisma.quotation.update({
      where: { id },
      data: {
        partyName: dto.customerName,
        partyPhone: dto.customerPhone,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        status: dto.status
      }
    });

    await this.logHistory(businessId, userId, 'UPDATE_QUOTATION', id, `Updated Quotation details`);
    return updated;
  }

  // 5. DELETE
  async remove(businessId: string, userId: string, id: string) {
    const quote = await this.findOne(businessId, id);
    if (quote.status === 'CONVERTED') throw new BadRequestException("Cannot delete a converted quotation.");

    await this.prisma.quotation.delete({ where: { id } });
    await this.logHistory(businessId, userId, 'DELETE_QUOTATION', id, `Deleted Quotation ${quote.quotationNo}`);
    return { success: true };
  }

// 6. CONVERT TO SALE
  async convertToSale(businessId: string, userId: string, id: string, dto: ConvertQuotationDto) {
    return this.prisma.$transaction(async (tx) => {
      // A. Fetch Quote
      const quote = await tx.quotation.findFirstOrThrow({
        where: { id, businessId },
        include: { items: true }
      });

      if (quote.status === 'CONVERTED') throw new BadRequestException("Already converted.");

      // B. Validate Stock & Prepare Sale Items
      const saleItemsData: Prisma.SaleItemCreateWithoutSaleInput[] = [];
      
      for (const qItem of quote.items) {
        if (!qItem.variantId) continue; 

        const variant = await tx.variant.findUnique({ where: { id: qItem.variantId }, include: { product: true } });
        
        if (!variant || variant.stock < qItem.quantity) {
          throw new BadRequestException(`Insufficient stock for ${qItem.itemName} to convert quote.`);
        }

        saleItemsData.push({
          itemId: variant.id,
          itemName: qItem.itemName,
          itemCode: variant.sku,
          quantity: new Prisma.Decimal(qItem.quantity),
          price: qItem.price,
          amount: qItem.amount,
          taxableAmount: qItem.amount,
          hsnCode: variant.hsnCode || '',
          unit: 'PCS',
          priceType: 'FIXED',
          tax: '0',
          sellingPrice: qItem.price,
          itemDescription: '', sacCode: '', batchNo: '', manufactureDate: new Date(), expiryDate: new Date(), 
          discountPercent: 0, discountAmount: 0, taxAmount: 0, cess: '', cessAmount: 0,
          isMrpEnabled: false, isWholesaleEnabled: false, isSerialisationEnabled: false, isBatchingEnabled: false,
          purchasePrice: 0, purchasePriceType: '', sellingPriceType: '', mrp: 0, wholesalePrice: 0, wholesalePriceType: '', wholesaleQuantity: 0
        });

        // Deduct Stock
        await tx.variant.update({
          where: { id: variant.id },
          data: { stock: { decrement: qItem.quantity } }
        });
      }

      // C. Create Sale
      const sale = await tx.sale.create({
        data: {
          businessId,
          partyName: quote.partyName,
          phoneNo: quote.partyPhone || '', 
          
          // Map to partyId (String)
          partyId: quote.customerUserId || '',
          partyType: quote.customerUserId ? 'Registered' : 'Unregistered',
          
          // --- FIX: Removed 'customerUserId' as it doesn't exist on Sale model ---
          
          invoicePrefix: 'INV',
          invoiceNo: Math.floor(Date.now() / 1000), 
          invoiceDate: new Date(),
          
          totalAmount: quote.totalAmount,
          totalTaxableAmount: quote.totalAmount,
          balanceAmount: 0, 
          status: 'FINALIZED',
          isSettled: true,
          
          saleItems: { create: saleItemsData },
          
          // --- REQUIRED LEGACY FIELDS (Must be provided as per schema) ---
          party: '', 
          placeOfSupply: '', 
          businessName: '', 
          billingAddress: '',
          shippingAddress: '',
          saleType: 'CASH',
          taxId: '',
          panNo: '',
          roundoffType: '',
          termCondition: '',
          notes: `Converted from Quote ${quote.quotationNo}`,
          
          // Boolean/Decimal Defaults
          isDueDateEnabled: false, 
          dueDate: new Date(), 
          paymentTerm: 0, 
          discountAmount: 0, 
          roundoffAmount: 0, 
          isDiscountAfterTaxEnabled: false, 
          discountPercent: 0, 
          isAutoRoundoffEnabled: false, 
          isScanItemEnabled: false, 
          isConverted: false, 
          totalTaxAmount: 0,
        }
      });

      // D. Update Quote Status
      await tx.quotation.update({
        where: { id },
        data: { status: 'CONVERTED', convertedSaleId: sale.id }
      });

      // E. Log History
      await tx.activityLog.create({
        data: {
          businessId,
          performedByUserId: userId,
          actionType: 'CONVERT_QUOTE',
          entityType: 'Quotation',
          entityId: id,
          description: `Converted Quote ${quote.quotationNo} to Sale`,
          createdAt: new Date()
        }
      });

      return sale;
    });
  }

  // 7. GET HISTORY
  async getHistory(businessId: string, id: string) {
    return this.prisma.activityLog.findMany({
      where: { businessId, entityId: id, entityType: 'Quotation' },
      orderBy: { createdAt: 'desc' },
      include: { performedByUser: { select: { name: true } } }
    });
  }

  // --- Helpers ---
  private async logHistory(businessId: string, userId: string, action: string, entityId: string, desc: string) {
    await this.prisma.activityLog.create({
      data: {
        businessId,
        performedByUserId: userId,
        actionType: action,
        entityType: 'Quotation',
        entityId: entityId,
        description: desc
      }
    });
  }

  private async findOrCreateCustomer(phone: string, name?: string) {
    let user = await this.prisma.customerUser.findUnique({ where: { phoneNumber: phone } });
    if (!user) {
      user = await this.prisma.customerUser.create({
        data: {
          phoneNumber: phone,
          name: name || 'Unknown',
          email: `${phone}@pos.local`,
          authSource: 'self',
          type: 'user'
        }
      });
    }
    return user;
  }
}