import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
// import { PdfService } from '../pdf.service'; 
import { SellerService } from '../seller.service';
import { CreateProformaInvoiceDto } from './dto/create-proforma-invoice.dto';
import { ProformaInvoicePaginationDto } from './dto/proforma-invoice-pagination.dto';
import { UpdateProformaInvoiceDto } from './dto/update-proforma-invoice.dto';
import { CreatePosSaleDto, PosPaymentMode } from '../dto/create-pos-sale.dto'; // <--- IMPORT ENUM HERE

@Injectable()
export class ProformaInvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    // private readonly pdfService: PdfService,
    @Inject(forwardRef(() => SellerService))
    private readonly sellerService: SellerService,
  ) {}

  // --- CREATE ---
  async create(businessId: string, dto: CreateProformaInvoiceDto) {
    return this.prisma.$transaction(async (tx) => {
      const quoteCount = await tx.quotation.count({ where: { businessId } });
      const piCount = await tx.quotation.count({ where: { businessId, proformaNo: { not: null } } });

      const quotationNo = `QT-${new Date().getFullYear()}-${String(quoteCount + 1).padStart(4, '0')}`;
      const proformaNo = `PI-${new Date().getFullYear()}-${String(piCount + 1).padStart(4, '0')}`;

      const totalAmount = dto.items.reduce((sum, item) => sum + item.quantity * item.price, 0);

      const proformaInvoice = await tx.quotation.create({
        data: {
          businessId,
          quotationNo,
          proformaNo,
          proformaDate: new Date(),
          status: 'PROFORMA_GENERATED',
          date: new Date(),
          validUntil: new Date(dto.validUntil),
          partyName: dto.partyName,
          partyPhone: dto.partyPhone,
          customerUserId: dto.customerUserId,
          totalAmount: new Prisma.Decimal(totalAmount),
          items: {
            create: dto.items.map(item => ({
              itemName: item.itemName,
              variantId: item.variantId,
              quantity: item.quantity,
              price: new Prisma.Decimal(item.price),
              taxAmount: 0,
              amount: new Prisma.Decimal(item.quantity * item.price),
            })),
          },
        },
        include: { items: true },
      });

      return proformaInvoice;
    });
  }

  // --- FIND ALL ---
  async findAll(businessId: string, query: ProformaInvoicePaginationDto) {
    const { page = 1, limit = 10, search, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.QuotationWhereInput = {
      businessId,
      proformaNo: { not: null },
      // FIX 1: Cast to 'any' to bypass stale Typescript definition until next restart
      status: { not: 'CANCELED' as any } 
    };

    if (search) {
      where.OR = [
        { partyName: { contains: search, mode: 'insensitive' } },
        { proformaNo: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (startDate || endDate) {
      where.date = {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
      };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.quotation.findMany({ where, skip, take: limit, orderBy: { date: 'desc' } }),
      this.prisma.quotation.count({ where }),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  // --- FIND ONE ---
  async findOne(businessId: string, id: string) {
    const proformaInvoice = await this.prisma.quotation.findFirst({
      where: { id, businessId, proformaNo: { not: null } },
      include: { items: true, business: true },
    });
    if (!proformaInvoice) {
      throw new NotFoundException('Proforma Invoice not found');
    }
    return proformaInvoice;
  }

  // --- UPDATE ---
  async update(businessId: string, id: string, dto: UpdateProformaInvoiceDto) {
    const existing = await this.findOne(businessId, id);
    if (existing.status === 'CONVERTED') {
      throw new BadRequestException('Cannot update a converted Proforma Invoice.');
    }

    return this.prisma.$transaction(async (tx) => {
      let calculatedTotal = Number(existing.totalAmount);

      if (dto.items) {
        calculatedTotal = dto.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
        await tx.quotationItem.deleteMany({ where: { quotationId: id } });
      }

      const updated = await tx.quotation.update({
        where: { id },
        data: {
          partyName: dto.partyName,
          partyPhone: dto.partyPhone,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
          totalAmount: new Prisma.Decimal(calculatedTotal),
          items: dto.items ? {
            create: dto.items.map(item => ({
              itemName: item.itemName,
              variantId: item.variantId,
              quantity: item.quantity,
              price: new Prisma.Decimal(item.price),
              amount: new Prisma.Decimal(item.quantity * item.price),
              taxAmount: 0,
            })),
          } : undefined,
        },
        include: { items: true },
      });
      return updated;
    });
  }

  // --- REMOVE / CANCEL ---
  async remove(businessId: string, id: string) {
    const existing = await this.findOne(businessId, id);
    if (existing.status === 'CONVERTED') {
      throw new BadRequestException('Cannot cancel a converted Proforma Invoice.');
    }
    return this.prisma.quotation.update({
      where: { id },
      // FIX 2: Cast to 'any' for the update as well
      data: { status: 'CANCELED' as any },
    });
  }
  
  // --- PDF ---
  // async generatePdf(businessId: string, id: string): Promise<Buffer> {
  //   const proformaInvoice = await this.findOne(businessId, id);
  //   // @ts-ignore
  //   return this.pdfService.generateProformaInvoicePdf(proformaInvoice);
  // }

  // --- CONVERT TO SALE ---
  async convertToSale(businessId: string, id: string, userId: string) {
    const proforma = await this.findOne(businessId, id);
    
    if (proforma.status === 'CONVERTED') throw new BadRequestException('Already converted.');
    // FIX 3: Cast comparison
    if (proforma.status === ('CANCELED' as any)) throw new BadRequestException('Cannot convert canceled invoice.');

    const saleDto: CreatePosSaleDto = {
      customerName: proforma.partyName,
      customerPhone: proforma.partyPhone || '', 
      items: proforma.items
        .filter(item => item.variantId) 
        .map(item => ({
          variantId: item.variantId!, 
          quantity: item.quantity,
          price: Number(item.price),
        })),
      amountReceived: 0, 
      // FIX 4: Use the imported Enum
      paymentMode: PosPaymentMode.CASH, 
    };

    if (saleDto.items.length === 0) {
      throw new BadRequestException("Cannot convert: No linked products (variants) found in this Proforma.");
    }

    // Call Seller Service
    const sale = await this.sellerService.createPosSale(businessId, saleDto);

    // Update Status
    await this.prisma.quotation.update({
      where: { id: proforma.id },
      data: {
        status: 'CONVERTED',
        convertedSaleId: sale.id,
      },
    });

    return sale;
  }
}