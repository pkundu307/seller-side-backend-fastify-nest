import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePaymentOutDto } from './dto/create-payment-out.dto';
import { PaymentOutPaginationDto } from './dto/create-payment-out.dto';
import { Prisma, BankCashCheque } from '@prisma/client';

@Injectable()
export class PaymentOutService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. GET PENDING SUPPLIERS & ACCOUNTS
  async getPendingSuppliers(businessId: string) {
    const [pendingPurchases, accounts] = await Promise.all([
      this.prisma.purchase.findMany({
        where: {
          businessId,
          balanceDue: { gt: 0 },
          status: { not: 'CANCELLED' },
          supplierPartyId: { not: null }
        },
        orderBy: { purchaseOrderDate: 'asc' }
      }),
      this.prisma.bankCashCheque.findMany({
        where: { businessId, isEnabled: true },
        orderBy: { isDefault: 'desc' }
      })
    ]);

    const groupedSuppliers = pendingPurchases.reduce((acc, purchase) => {
      const sId = purchase.supplierPartyId!;
      if (!acc[sId]) {
        acc[sId] = {
          supplierId: sId,
          supplierName: purchase.supplierName,
          totalOwed: 0,
          invoices: []
        };
      }
      const due = Number(purchase.balanceDue);
      acc[sId].totalOwed += due;
      acc[sId].invoices.push({
        purchaseId: purchase.id,
        invoiceNo: purchase.purchaseOrderNo,
        date: purchase.purchaseOrderDate,
        totalAmount: Number(purchase.totalAmount),
        balanceDue: due
      });
      return acc;
    }, {} as Record<string, any>);

    return {
      accounts,
      suppliers: Object.values(groupedSuppliers)
    };
  }

  // 2. CREATE PAYMENT OUT
  async create(businessId: string, dto: CreatePaymentOutDto) {
    const amountDec = new Prisma.Decimal(dto.amount);
    const date = new Date(dto.date);

    // Verify Party (Supplier)
    const party = await this.prisma.party.findUnique({ where: { id: dto.partyId } });
    if (!party || party.partyType !== 'SUPPLIER') throw new NotFoundException('Supplier not found');

    return this.prisma.$transaction(async (tx) => {
      // A. Identify Source Account
      let account: BankCashCheque | null = null;
      if (dto.fromAccountId) {
        account = await tx.bankCashCheque.findFirst({
          where: { id: dto.fromAccountId, businessId, isEnabled: true }
        });
      } else {
        account = await tx.bankCashCheque.findFirst({
          where: { businessId, accountType: dto.paymentMode as any, isEnabled: true },
          orderBy: { isDefault: 'desc' }
        });
      }
      if (!account) throw new BadRequestException("No valid Bank/Cash account found.");

      // B. Update Shop Account (Decrease Balance)
      const voucherNo = `PAY-${Date.now()}`;
      await tx.bankCashCheque.update({
        where: { id: account.id },
        data: { closingBalance: { decrement: amountDec } }
      });

      await tx.bankCashChequeTransaction.create({
        data: {
          businessId,
          accountId: account.id,
          transactionType: 'DEBIT',
          amount: amountDec,
          runningBalance: account.closingBalance.minus(amountDec),
          referenceType: 'PURCHASE',
          transactionNo: voucherNo,
          paymentMode: dto.paymentMode,
          partyName: party.partyName,
          invoiceNo: voucherNo
        }
      });

      // C. Update Party Ledger (Debit the Supplier)
      const paymentEntry = await tx.partyLedger.create({
        data: {
          businessId,
          partyId: dto.partyId,
          partyType: 'SUPPLIER',
          partyName: party.partyName,
          transactionDate: date,
          description: dto.notes || `Payment to Supplier (${dto.paymentMode})`,
          debit: amountDec, // Debiting supplier reduces our liability
          credit: 0,
          linkedPurchaseId: dto.purchaseId || null
        }
      });

      // D. Settle Specific Purchase Invoice
      if (dto.purchaseId) {
        const purchase = await tx.purchase.findUnique({ where: { id: dto.purchaseId } });
        if (!purchase || purchase.supplierPartyId !== dto.partyId) {
          throw new BadRequestException("Invoice owner mismatch or not found");
        }

        const newBalance = new Prisma.Decimal(purchase.balanceDue).minus(amountDec);
        await tx.purchase.update({
          where: { id: dto.purchaseId },
          data: {
            balanceDue: newBalance,
            amountPaid: { increment: amountDec },
            status: newBalance.lte(0) ? 'RECEIVED' : 'PARTIAL'
          }
        });
      }

      return paymentEntry;
    });
  }

  async findAll(businessId: string, query: PaymentOutPaginationDto) {
    const { page = 1, limit = 10, search, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PartyLedgerWhereInput = {
      businessId,
      partyType: 'SUPPLIER',
      debit: { gt: 0 },
      ...(search && { partyName: { contains: search, mode: 'insensitive' } }),
      ...(startDate && endDate && {
        transactionDate: { gte: new Date(startDate), lte: new Date(endDate) }
      })
    };

    const [data, total] = await Promise.all([
      this.prisma.partyLedger.findMany({
        where,
        skip,
        take: limit,
        orderBy: { transactionDate: 'desc' },
        include: { party: { select: { phoneNo: true } } }
      }),
      this.prisma.partyLedger.count({ where })
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async remove(businessId: string, id: string) {
    const entry = await this.prisma.partyLedger.findFirst({
      where: { id, businessId, partyType: 'SUPPLIER' }
    });
    if (!entry) throw new NotFoundException('Payment not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.partyLedger.delete({ where: { id } });

      // Revert Purchase balance
      if (entry.linkedPurchaseId) {
        await tx.purchase.update({
          where: { id: entry.linkedPurchaseId },
          data: {
            balanceDue: { increment: entry.debit },
            amountPaid: { decrement: entry.debit },
            status: 'PARTIAL'
          }
        });
      }

      // Revert Bank Account
      const account = await tx.bankCashCheque.findFirst({
        where: { businessId, isDefault: true }
      });

      if (account) {
        await tx.bankCashCheque.update({
          where: { id: account.id },
          data: { closingBalance: { increment: entry.debit } }
        });
      }

      return { message: 'Payment voided successfully' };
    });
  }
}