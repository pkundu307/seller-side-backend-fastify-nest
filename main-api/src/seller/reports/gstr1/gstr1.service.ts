// src/seller/reports/gstr1/gstr1.service.ts

import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Gstr1QueryDto } from './dto/gstr1-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class Gstr1Service {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────
  // UTIL: Resolve date range
  // ─────────────────────────────────────────────
  private resolveDateRange(query: Gstr1QueryDto): { start: Date; end: Date } {
    if (query.startDate && query.endDate) {
      return { start: new Date(query.startDate), end: new Date(query.endDate) };
    }
    if (query.month) {
      const [year, month] = query.month.split('-').map(Number);
      return {
        start: new Date(year, month - 1, 1),
        end:   new Date(year, month, 0, 23, 59, 59),
      };
    }
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end:   new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    };
  }

  // ─────────────────────────────────────────────
  // UTIL: Base Sale where clause
  // ─────────────────────────────────────────────
  private baseSaleWhere(
    businessId: string,
    start: Date,
    end: Date,
  ): Prisma.SaleWhereInput {
    return {
      businessId,
      invoiceDate: { gte: start, lte: end },
      deletedAt:   null,
      status:      'FINALIZED',
    };
  }

  // ─────────────────────────────────────────────
  // UTIL: Is unregistered buyer (taxId is non-nullable String in schema)
  // taxId = '' means no GSTIN provided
  // ─────────────────────────────────────────────
  private unregisteredWhere(): Prisma.SaleWhereInput {
    return { taxId: '' };
  }

  // ─────────────────────────────────────────────
  // UTIL: Format invoice number
  // ─────────────────────────────────────────────
  private fmtInv(prefix: string, no: number): string {
    return `${prefix}${no}`;
  }

  // ─────────────────────────────────────────────
  // 1. FULL GSTR-1 SUMMARY
  // ─────────────────────────────────────────────
  async getGstr1Summary(businessId: string, query: Gstr1QueryDto) {
    const { start, end } = this.resolveDateRange(query);

    const business = await this.prisma.business.findUnique({
      where:  { id: businessId },
      select: { name: true, gstNumber: true, state: true, stateCode: true },
    });
    if (!business) throw new BadRequestException('Business not found');

    const [b2b, b2cl, b2cs, cdnr, cdnur, exemp, hsnB2b, hsnB2c, docs] =
      await Promise.all([
        this.getB2B(businessId, query),
        this.getB2CL(businessId, query),
        this.getB2CS(businessId, query),
        this.getCDNR(businessId, query),
        this.getCDNUR(businessId, query),
        this.getEXEMP(businessId, query),
        this.getHSN(businessId, query, 'B2B'),
        this.getHSN(businessId, query, 'B2C'),
        this.getDocumentsIssued(businessId, query),
      ]);

    return {
      period:   query.month ?? `${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`,
      business: { name: business.name, gstin: business.gstNumber, state: business.state },
      b2b, b2cl, b2cs, cdnr, cdnur, exemp, hsnB2b, hsnB2c, docs,
    };
  }

  // ─────────────────────────────────────────────
  // 2. B2B
  // ─────────────────────────────────────────────
  async getB2B(businessId: string, query: Gstr1QueryDto) {
    const { start, end } = this.resolveDateRange(query);

    const sales = await this.prisma.sale.findMany({
      where: {
        ...this.baseSaleWhere(businessId, start, end),
        NOT: { taxId: '' }, // registered = taxId is not empty
      },
      include: {
        saleItems: true,
        saleTaxes: true,
      },
      orderBy: { invoiceDate: 'desc' },
    });

    // Valid GSTIN = exactly 15 chars
    const b2b = sales.filter(s => s.taxId.trim().length === 15);

    const rows = b2b.map(s => ({
      receiverGstin:  s.taxId,
      receiverName:   s.partyName,
      invoiceNo:      this.fmtInv(s.invoicePrefix, s.invoiceNo),
      invoiceDate:    s.invoiceDate,
      invoiceValue:   Number(s.totalAmount),
      placeOfSupply:  s.placeOfSupply,
      reverseCharge:  s.isReverseCharge ? 'Y' : 'N',
      invoiceType:    s.supplyType ?? 'Regular',
      ecommerceGstin: s.ecommerceGstin ?? null,
      taxBreakup: s.saleTaxes.map(t => ({
        rate:         Number(t.taxRate),
        taxableValue: Number(t.taxableAmount),
        igst:         Number(t.igst),
        cgst:         Number(t.cgst),
        sgst:         Number(t.sgst),
        cess:         Number(t.cess),
      })),
    }));

    return {
      summary: {
        numberOfRecipients: new Set(b2b.map(s => s.taxId)).size,
        numberOfInvoices:   b2b.length,
        totalInvoiceValue:  b2b.reduce((s, i) => s + Number(i.totalAmount), 0),
        totalTaxableValue:  b2b.reduce((s, i) => s + Number(i.totalTaxableAmount), 0),
        totalCess:          b2b.reduce((sum, s) => sum + s.saleTaxes.reduce((t, x) => t + Number(x.cess), 0), 0),
      },
      data: rows,
    };
  }

  // ─────────────────────────────────────────────
  // 3. B2CL
  // ─────────────────────────────────────────────
  async getB2CL(businessId: string, query: Gstr1QueryDto) {
    const { start, end } = this.resolveDateRange(query);

    const business = await this.prisma.business.findUnique({
      where: { id: businessId }, select: { stateCode: true },
    });

    const sales = await this.prisma.sale.findMany({
      where: {
        ...this.baseSaleWhere(businessId, start, end),
        ...this.unregisteredWhere(),      // taxId: ''
        totalAmount: { gt: 250000 },
      },
      include: {
        saleTaxes: true,  // ✅ required — was missing
      },
      orderBy: { invoiceDate: 'desc' },
    });

    // Interstate only: placeOfSupplyCode !== seller's stateCode
    const b2cl = sales.filter(
      s => s.placeOfSupplyCode && s.placeOfSupplyCode !== business?.stateCode,
    );

    const rows = b2cl.map(s => ({
      invoiceNo:      this.fmtInv(s.invoicePrefix, s.invoiceNo),
      invoiceDate:    s.invoiceDate,
      invoiceValue:   Number(s.totalAmount),
      placeOfSupply:  s.placeOfSupply,
      reverseCharge:  s.isReverseCharge ? 'Y' : 'N',
      ecommerceGstin: s.ecommerceGstin ?? null,
      taxBreakup: s.saleTaxes.map(t => ({
        rate:         Number(t.taxRate),
        taxableValue: Number(t.taxableAmount),
        igst:         Number(t.igst),
        cess:         Number(t.cess),
      })),
    }));

    return {
      summary: {
        numberOfInvoices:  b2cl.length,
        totalInvoiceValue: b2cl.reduce((s, i) => s + Number(i.totalAmount), 0),
        totalTaxableValue: b2cl.reduce((s, i) => s + Number(i.totalTaxableAmount), 0),
        totalCess:         b2cl.reduce((sum, s) => sum + s.saleTaxes.reduce((t, x) => t + Number(x.cess), 0), 0),
      },
      data: rows,
    };
  }

  // ─────────────────────────────────────────────
  // 4. B2CS
  // ─────────────────────────────────────────────
  async getB2CS(businessId: string, query: Gstr1QueryDto) {
    const { start, end } = this.resolveDateRange(query);

    const business = await this.prisma.business.findUnique({
      where: { id: businessId }, select: { stateCode: true },
    });

    const sales = await this.prisma.sale.findMany({
      where: {
        ...this.baseSaleWhere(businessId, start, end),
        ...this.unregisteredWhere(),  // taxId: ''
      },
      include: {
        saleTaxes: true,  // ✅ required — was missing
      },
    });

    // B2CS = intrastate OR interstate but <= ₹2.5L
    const b2cs = sales.filter(s => {
      const isIntra = s.placeOfSupplyCode === business?.stateCode;
      const isSmall = Number(s.totalAmount) <= 250000;
      return isIntra || isSmall;
    });

    // Group by placeOfSupply + taxRate + ecommerceGstin
    const grouped = new Map<string, any>();
    for (const s of b2cs) {
      for (const t of s.saleTaxes) {
        const key = `${s.placeOfSupplyCode}_${t.taxRate}_${s.ecommerceGstin ?? 'DIRECT'}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            type:           'OE',
            placeOfSupply:  s.placeOfSupply,
            applicableTax:  Number(t.taxRate),
            rate:           Number(t.taxRate),
            taxableValue:   0,
            cess:           0,
            ecommerceGstin: s.ecommerceGstin ?? null,
          });
        }
        const g = grouped.get(key);
        g.taxableValue += Number(t.taxableAmount);
        g.cess         += Number(t.cess);
      }
    }

    return {
      summary: {
        totalInvoiceValue: b2cs.reduce((s, i) => s + Number(i.totalAmount), 0),
        totalTaxableValue: b2cs.reduce((s, i) => s + Number(i.totalTaxableAmount), 0),
        totalCess:         b2cs.reduce((sum, s) => sum + s.saleTaxes.reduce((t, x) => t + Number(x.cess), 0), 0),
      },
      data: Array.from(grouped.values()),
    };
  }

  // ─────────────────────────────────────────────
  // 5. CDNR
  // ─────────────────────────────────────────────
  async getCDNR(businessId: string, query: Gstr1QueryDto) {
    const { start, end } = this.resolveDateRange(query);

    const [creditNotes, debitNotes] = await Promise.all([
      this.prisma.creditNote.findMany({
        where: {
          businessId,
          date:       { gte: start, lte: end },
          status:     'ACTIVE',
          NOT: { buyerGstin: '' },  // registered = buyerGstin present
          buyerGstin: { not: undefined },
        },
        orderBy: { date: 'desc' },
      }),
      this.prisma.salesDebitNote.findMany({
        where: {
          businessId,
          date:       { gte: start, lte: end },
          status:     'ACTIVE',
          NOT: { buyerGstin: '' },
        },
        orderBy: { date: 'desc' },
      }),
    ]);

    const cnRows = creditNotes.map(n => ({
      receiverGstin:  n.buyerGstin,
      noteNumber:     n.noteNo,
      noteDate:       n.date,
      noteType:       'Credit Note',
      placeOfSupply:  n.placeOfSupplyCode,
      reverseCharge:  'N',
      noteSupplyType: 'Regular',
      noteValue:      Number(n.amount),
      taxableValue:   Number(n.taxableAmount),
      rate:           Number(n.rate),
      igst:           Number(n.igst),
      cgst:           Number(n.cgst),
      sgst:           Number(n.sgst),
      cess:           Number(n.cessAmount),
    }));

    const dnRows = debitNotes.map(n => ({
      receiverGstin:  n.buyerGstin,
      noteNumber:     n.noteNo,
      noteDate:       n.date,
      noteType:       'Debit Note',
      placeOfSupply:  n.placeOfSupplyCode,
      reverseCharge:  'N',
      noteSupplyType: 'Regular',
      noteValue:      Number(n.amount),
      taxableValue:   Number(n.taxableAmount),
      rate:           Number(n.rate),
      igst:           Number(n.igst),
      cgst:           Number(n.cgst),
      sgst:           Number(n.sgst),
      cess:           Number(n.cessAmount),
    }));

    const allNotes = [...cnRows, ...dnRows];

    return {
      summary: {
        numberOfRecipients: new Set([
          ...creditNotes.map(n => n.buyerGstin),
          ...debitNotes.map(n => n.buyerGstin),
        ]).size,
        numberOfNotes:     allNotes.length,
        totalNoteValue:    allNotes.reduce((s, n) => s + n.noteValue, 0),
        totalTaxableValue: allNotes.reduce((s, n) => s + n.taxableValue, 0),
        totalCess:         allNotes.reduce((s, n) => s + n.cess, 0),
      },
      data: allNotes,
    };
  }

  // ─────────────────────────────────────────────
  // 6. CDNUR
  // ─────────────────────────────────────────────
  async getCDNUR(businessId: string, query: Gstr1QueryDto) {
    const { start, end } = this.resolveDateRange(query);

    const [creditNotes, debitNotes] = await Promise.all([
      this.prisma.creditNote.findMany({
        where: {
          businessId,
          date:       { gte: start, lte: end },
          status:     'ACTIVE',
          buyerGstin: '',  // unregistered = empty string
        },
        orderBy: { date: 'desc' },
      }),
      this.prisma.salesDebitNote.findMany({
        where: {
          businessId,
          date:       { gte: start, lte: end },
          status:     'ACTIVE',
          buyerGstin: '',
        },
        orderBy: { date: 'desc' },
      }),
    ]);

    const cnRows = creditNotes.map(n => ({
      urType:        'B2CL',
      noteNumber:    n.noteNo,
      noteDate:      n.date,
      noteType:      'Credit Note',
      placeOfSupply: n.placeOfSupplyCode,
      noteValue:     Number(n.amount),
      taxableValue:  Number(n.taxableAmount),
      rate:          Number(n.rate),
      igst:          Number(n.igst),
      cess:          Number(n.cessAmount),
    }));

    const dnRows = debitNotes.map(n => ({
      urType:        'B2CL',
      noteNumber:    n.noteNo,
      noteDate:      n.date,
      noteType:      'Debit Note',
      placeOfSupply: n.placeOfSupplyCode,
      noteValue:     Number(n.amount),
      taxableValue:  Number(n.taxableAmount),
      rate:          Number(n.rate),
      igst:          Number(n.igst),
      cess:          Number(n.cessAmount),
    }));

    const allNotes = [...cnRows, ...dnRows];

    return {
      summary: {
        numberOfNotes:     allNotes.length,
        totalNoteValue:    allNotes.reduce((s, n) => s + n.noteValue, 0),
        totalTaxableValue: allNotes.reduce((s, n) => s + n.taxableValue, 0),
        totalCess:         allNotes.reduce((s, n) => s + n.cess, 0),
      },
      data: allNotes,
    };
  }

  // ─────────────────────────────────────────────
  // 7. EXEMP
  // ─────────────────────────────────────────────
  async getEXEMP(businessId: string, query: Gstr1QueryDto) {
    const { start, end } = this.resolveDateRange(query);

    const business = await this.prisma.business.findUnique({
      where: { id: businessId }, select: { stateCode: true },
    });

    const sales = await this.prisma.sale.findMany({
      where: {
        ...this.baseSaleWhere(businessId, start, end),
        saleItems: {
          some: {
            OR: [{ isNilRated: true }, { isExempt: true }, { isNonGst: true }],
          },
        },
      },
      include: {
        saleItems: true,  // ✅ required — was missing
      },
    });

    const result = {
      interStateRegistered:   { nilRated: 0, exempted: 0, nonGst: 0 },
      interStateUnregistered: { nilRated: 0, exempted: 0, nonGst: 0 },
      intraStateRegistered:   { nilRated: 0, exempted: 0, nonGst: 0 },
      intraStateUnregistered: { nilRated: 0, exempted: 0, nonGst: 0 },
    };

    for (const s of sales) {
      const isInter = s.placeOfSupplyCode !== business?.stateCode;
      const isReg   = s.taxId.trim().length === 15;
      const rowKey  = isInter
        ? (isReg ? 'interStateRegistered'   : 'interStateUnregistered')
        : (isReg ? 'intraStateRegistered'   : 'intraStateUnregistered');

      for (const item of s.saleItems) {  // ✅ now works
        const amt = Number(item.taxableAmount);
        if (item.isNilRated) result[rowKey].nilRated  += amt;
        if (item.isExempt)   result[rowKey].exempted  += amt;
        if (item.isNonGst)   result[rowKey].nonGst    += amt;
      }
    }

    return {
      summary: {
        totalNilRated: Object.values(result).reduce((s, r) => s + r.nilRated, 0),
        totalExempted: Object.values(result).reduce((s, r) => s + r.exempted, 0),
        totalNonGst:   Object.values(result).reduce((s, r) => s + r.nonGst, 0),
        totalSupplies: Object.values(result).reduce((s, r) => s + r.nilRated + r.exempted + r.nonGst, 0),
      },
      data: result,
    };
  }

  // ─────────────────────────────────────────────
  // 8. HSN Summary
  // ─────────────────────────────────────────────
  async getHSN(businessId: string, query: Gstr1QueryDto, type: 'B2B' | 'B2C') {
    const { start, end } = this.resolveDateRange(query);

    const sales = await this.prisma.sale.findMany({
      where: {
        ...this.baseSaleWhere(businessId, start, end),
        ...(type === 'B2B'
          ? { NOT: { taxId: '' } }             // registered
          : { taxId: '' }),                     // unregistered — ✅ no null needed
      },
      include: {
        saleItems: true,  // ✅ required — was missing
        saleTaxes: true,  // ✅ required — was missing
      },
    });

    const hsnMap = new Map<string, any>();

    for (const s of sales) {
      for (const item of s.saleItems) {   // ✅ now works
        const hsn = item.hsnCode?.trim() || 'UNKNOWN';
        if (!hsnMap.has(hsn)) {
          hsnMap.set(hsn, {
            hsn,
            description:   item.itemName,
            uqc:           item.uqc ?? 'NOS',
            totalQuantity: 0,
            totalValue:    0,
            taxableValue:  0,
            igst: 0, cgst: 0, sgst: 0, cess: 0,
          });
        }
        const h = hsnMap.get(hsn);
        h.totalQuantity += Number(item.quantity);
        h.totalValue    += Number(item.amount);
        h.taxableValue  += Number(item.taxableAmount);
        h.cess          += Number(item.cessAmount);
      }
    }

    // Add IGST/CGST/SGST from saleTaxes matched by hsnCode
    for (const s of sales) {
      for (const t of s.saleTaxes) {     // ✅ now works
        const hsn = t.hsnCode?.trim() || 'UNKNOWN';
        if (hsnMap.has(hsn)) {
          const h = hsnMap.get(hsn);
          h.igst += Number(t.igst);
          h.cgst += Number(t.cgst);
          h.sgst += Number(t.sgst);
        }
      }
    }

    const data = Array.from(hsnMap.values()).map(h => ({
      ...h,
      rate: h.taxableValue > 0
        ? Math.round(((h.igst || h.cgst * 2) / h.taxableValue) * 100)
        : 0,
    }));

    return {
      summary: {
        numberOfHsn:       data.length,
        totalValue:        data.reduce((s, h) => s + h.totalValue, 0),
        totalTaxableValue: data.reduce((s, h) => s + h.taxableValue, 0),
        totalIgst:         data.reduce((s, h) => s + h.igst, 0),
        totalCgst:         data.reduce((s, h) => s + h.cgst, 0),
        totalSgst:         data.reduce((s, h) => s + h.sgst, 0),
        totalCess:         data.reduce((s, h) => s + h.cess, 0),
      },
      data,
    };
  }

  // ─────────────────────────────────────────────
  // 9. Documents Issued
  // ─────────────────────────────────────────────
  async getDocumentsIssued(businessId: string, query: Gstr1QueryDto) {
    const { start } = this.resolveDateRange(query);
    const year  = start.getFullYear();
    const month = start.getMonth() + 1;

    const series = await this.prisma.invoiceSeries.findMany({
      where: { businessId, periodYear: year, periodMonth: month },
    });

    const byType = (type: string) =>
      series
        .filter(s => s.documentType === type)
        .reduce(
          (acc, s) => ({
            totalIssued:    acc.totalIssued    + s.totalIssued,
            totalCancelled: acc.totalCancelled + s.totalCancelled,
          }),
          { totalIssued: 0, totalCancelled: 0 },
        );

    const invoices    = byType('TAXINVOICE');
    const revisedInv  = byType('REVISEDINVOICE');
    const creditNotes = byType('CREDITNOTE');
    const debitNotes  = byType('DEBITNOTE');

    return {
      data: [
        { docType: 'Tax Invoices',      ...invoices,    net: invoices.totalIssued    - invoices.totalCancelled },
        { docType: 'Revised Invoices',  ...revisedInv,  net: revisedInv.totalIssued  - revisedInv.totalCancelled },
        { docType: 'Credit Notes',      ...creditNotes, net: creditNotes.totalIssued - creditNotes.totalCancelled },
        { docType: 'Debit Notes',       ...debitNotes,  net: debitNotes.totalIssued  - debitNotes.totalCancelled },
      ],
    };
  }
}
