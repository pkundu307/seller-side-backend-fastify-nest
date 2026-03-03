import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { PurchasePaginationDto } from './dto/purchase-pagination.dto';
import { Prisma, PurchaseStatus } from '@prisma/client';

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

  async findAll(businessId: string, query: PurchasePaginationDto) {
    const { page = 1, limit = 15, search, startDate, endDate, filter } = query;
    const skip = (page - 1) * limit;

    let start: Date | undefined = startDate ? new Date(startDate) : undefined;
    let end: Date | undefined = endDate ? new Date(endDate) : undefined;

    if (filter) {
      const now = new Date();
      end = new Date(new Date(now).setHours(23, 59, 59, 999));
      const s = new Date(now);
      if (filter === 'today')   start = new Date(new Date(s).setHours(0, 0, 0, 0));
      if (filter === 'last7')   start = new Date(new Date(s).setDate(s.getDate() - 7));
      if (filter === 'last30')  start = new Date(new Date(s).setDate(s.getDate() - 30));
      if (filter === 'last365') start = new Date(new Date(s).setDate(s.getDate() - 365));
    }

    const where: Prisma.PurchaseWhereInput = {
      businessId,
      ...(search && {
        OR: [
          { supplierName: { contains: search, mode: 'insensitive' } },
          { purchaseOrderNo: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...((start || end) && {
        purchaseOrderDate: { gte: start, lte: end },
      }),
    };

  const [purchases, total] = await Promise.all([
  this.prisma.purchase.findMany({
    where,
    skip,
    take: Number(limit),
    orderBy: { purchaseOrderDate: 'desc' },
  }),
  this.prisma.purchase.count({ where }),
]);

// Run aggregate separately (1 connection)
const stats = await this.prisma.purchase.aggregate({
  where,
  _sum: { totalAmount: true, amountPaid: true, balanceDue: true },
});

    const now = new Date();
    const formattedPurchases = purchases.map((p) => {
      let dueInLabel = 'No Due Date';
      if (p.expectedDate) {
        const diffDays = Math.ceil(
          (new Date(p.expectedDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (p.balanceDue.isZero())  dueInLabel = 'Fully Paid';
        else if (diffDays === 0)    dueInLabel = 'Due Today';
        else if (diffDays > 0)      dueInLabel = `Due in ${diffDays} days`;
        else                        dueInLabel = `Overdue by ${Math.abs(diffDays)} days`;
      }
      return { ...p, dueInLabel };
    });

    return {
      data: formattedPurchases,
      stats: {
        totalPurchases: stats._sum.totalAmount || 0,
        totalPaid:      stats._sum.amountPaid  || 0,
        totalUnpaid:    stats._sum.balanceDue  || 0,
      },
      meta: {
        total,
        page: Number(page),
        lastPage: Math.ceil(total / Number(limit)),
      },
    };
  }

  async create(businessId: string, dto: CreatePurchaseDto) {
    return this.prisma.$transaction(async (tx) => {
      let totalTaxable  = new Prisma.Decimal(0);
      let totalTaxAmount = new Prisma.Decimal(0);

      // A. Calculate Item Totals
      const purchaseItemsData = dto.items.map((item) => {
        const lineTaxable = new Prisma.Decimal(item.purchasePrice)
          .times(item.quantity)
          .minus(item.discount || 0);
        const lineTax = lineTaxable.times(item.taxRate / 100);
        totalTaxable   = totalTaxable.plus(lineTaxable);
        totalTaxAmount = totalTaxAmount.plus(lineTax);

        return {
          variantId:     item.variantId,
          itemName:      item.itemName,
          hsnCode:       item.hsnCode,
          quantity:      item.quantity,
          purchasePrice: item.purchasePrice,
          taxRate:       item.taxRate,
          taxAmount:     lineTax,
          discount:      item.discount || 0,
          totalAmount:   lineTaxable.plus(lineTax),
        };
      });

      // B. Apply Charges, TCS, Rounding
      const additionalCharges = new Prisma.Decimal(dto.additionalCharges || 0);
      let finalAmount = totalTaxable.plus(totalTaxAmount).plus(additionalCharges);

      let tcsAmount = new Prisma.Decimal(0);
      if (dto.tcsRate) {
        tcsAmount   = finalAmount.times(dto.tcsRate / 100);
        finalAmount = finalAmount.plus(tcsAmount);
      }

      if (dto.autoRoundOff) {
        finalAmount = new Prisma.Decimal(Math.round(finalAmount.toNumber()));
      }

      const balanceDue = finalAmount.minus(dto.amountPaid);

      // C. Create Purchase Record — now stores all 4 new fields
      const purchase = await tx.purchase.create({
        data: {
          businessId,
          supplierName:       dto.supplierName,
          supplierGstin:      dto.supplierGstin,
          purchaseOrderNo:    dto.purchaseOrderNo,
          purchaseOrderDate:  new Date(dto.purchaseOrderDate),
          expectedDate:       dto.dueDate ? new Date(dto.dueDate) : null,
          totalAmount:        finalAmount,
          amountPaid:         dto.amountPaid,
          balanceDue,
          additionalCharges,          // ✅ NEW
          tcsRate:            dto.tcsRate || null,  // ✅ NEW
          tcsAmount,                  // ✅ NEW
          depositAccountId:   dto.depositAccountId || null, // ✅ NEW
          status:             PurchaseStatus.RECEIVED,
          addToInventory:     true,
          notes:              dto.notes,
          items:              { create: purchaseItemsData },
        },
      });

      // D. Stock Increase
      for (const item of dto.items) {
        await tx.variant.update({
          where: { id: item.variantId },
          data:  { stock: { increment: item.quantity } },
        });
      }

      // E. Supplier Ledger — Purchase Credit
      await tx.partyLedger.create({
        data: {
          businessId,
          partyType:       'SUPPLIER',
          partyName:       dto.supplierName,
          transactionDate: new Date(),
          description:     `Purchase Invoice #${dto.purchaseOrderNo}`,
          credit:          finalAmount,
          debit:           0,
          linkedPurchaseId: purchase.id,
        },
      });

      // F. Payment Recording
      if (dto.amountPaid > 0) {
        const account = await tx.bankCashCheque.findFirst({
          where: { businessId, id: dto.depositAccountId, isEnabled: true },
        });
        if (!account) throw new BadRequestException('Valid payment account required.');

        await tx.bankCashCheque.update({
          where: { id: account.id },
          data:  { closingBalance: { decrement: dto.amountPaid } },
        });

        await tx.bankCashChequeTransaction.create({
          data: {
            businessId,
            accountId:       account.id,
            transactionType: 'DEBIT',
            amount:          dto.amountPaid,
            runningBalance:  account.closingBalance.minus(dto.amountPaid),
            referenceId:     purchase.id,
            referenceType:   'PURCHASE',
            invoiceNo:       dto.purchaseOrderNo,
            partyName:       dto.supplierName,
          },
        });

        // Supplier Ledger — Payment Debit
        await tx.partyLedger.create({
          data: {
            businessId,
            partyType:        'SUPPLIER',
            partyName:        dto.supplierName,
            transactionDate:  new Date(),
            description:      `Payment for Inv #${dto.purchaseOrderNo}`,
            debit:            dto.amountPaid,
            credit:           0,
            linkedPurchaseId: purchase.id,
          },
        });
      }

      return purchase;
    });
  }
}
