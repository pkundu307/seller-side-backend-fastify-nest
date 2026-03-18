// src/seller/expenses/expenses.service.ts

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseQueryDto } from './dto/expense-query.dto';
import { Prisma, TransactionType, ReferenceType } from '@prisma/client';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================
  // 1. CREATE
  // ==========================
  async create(businessId: string, dto: CreateExpenseDto) {
    return this.prisma.$transaction(async (tx) => {

      const lastExpense = await tx.expense.findFirst({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        select: { expenseNumber: true },
      });

      let nextNumber = 1;
      if (lastExpense?.expenseNumber) {
        const currentNum = parseInt(lastExpense.expenseNumber.replace('EXP-', ''), 10);
        if (!isNaN(currentNum)) nextNumber = currentNum + 1;
      }

      const autoGenNumber = `EXP-${nextNumber.toString().padStart(4, '0')}`;

      let totalTaxable = new Prisma.Decimal(0);
      let totalTax = new Prisma.Decimal(0);

      const itemsData = dto.items.map((item) => {
        const taxable = new Prisma.Decimal(item.taxableAmount);
        const rate = new Prisma.Decimal(item.taxRate || 0);
        const taxVal = taxable.times(rate.div(100));

        totalTaxable = totalTaxable.plus(taxable);
        totalTax = totalTax.plus(taxVal);

        return {
          description: item.description,
          hsnCode: item.hsnCode,
          taxableAmount: taxable,
          taxRate: rate,
          cgstAmount: taxVal.div(2),
          sgstAmount: taxVal.div(2),
          totalAmount: taxable.plus(taxVal),
        };
      });

      const grandTotal = totalTaxable.plus(totalTax);

      const expense = await tx.expense.create({
        data: {
          businessId,
          expenseNumber: autoGenNumber,
          expenseDate: new Date(dto.expenseDate),
          category: dto.category,
          vendorName: dto.vendorName,
          vendorGstin: dto.vendorGstin,
          placeOfSupply: dto.placeOfSupply,
          invoiceRef: dto.invoiceRef,
          isPaid: dto.isPaid,
          paymentMode: dto.paymentMode,
          totalTaxableAmount: totalTaxable,
          totalTaxAmount: totalTax,
          totalAmount: grandTotal,
          notes: dto.notes,
          items: { create: itemsData },
        },
      });

      if (dto.isPaid && dto.accountId) {
        await tx.bankCashCheque.update({
          where: { id: dto.accountId },
          data: { closingBalance: { decrement: grandTotal } },
        });

        await tx.bankCashChequeTransaction.create({
          data: {
            businessId,
            accountId: dto.accountId,
            transactionType: TransactionType.DEBIT,
            amount: grandTotal,
            runningBalance: 0,
            referenceId: expense.id,
            referenceType: ReferenceType.EXPENSE,
            invoiceNo: autoGenNumber,
            partyName: dto.vendorName || 'General Expense',
          },
        });
      }

      return expense;
    });
  }

  // ==========================
  // 2. FIND ALL
  // ==========================
  async findAll(businessId: string, query: ExpenseQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ExpenseWhereInput = {
      businessId,
      deleteAt: null,
    };

    if (query.search) {
      where.OR = [
        { vendorName: { contains: query.search, mode: 'insensitive' } },
        { invoiceRef: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.startDate || query.endDate) {
      where.expenseDate = {
        gte: query.startDate ? new Date(query.startDate) : undefined,
        lte: query.endDate ? new Date(query.endDate) : undefined,
      };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { expenseDate: 'desc' },
        include: { items: true },
      }),
      this.prisma.expense.count({ where }),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ==========================
  // 3. FIND ONE
  // ==========================
  async findOne(businessId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, businessId, deleteAt: null },
      include: { items: true },
    });

    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  // ==========================
  // 4. UPDATE
  // ==========================
  async update(businessId: string, id: string, dto: UpdateExpenseDto) {
    await this.findOne(businessId, id);

    if (dto.items || dto.totalAmount) {
      throw new BadRequestException(
        'To change amounts or items, please delete this expense and create a new one to maintain ledger integrity.',
      );
    }

    return this.prisma.expense.update({
      where: { id },
      data: {
        vendorName: dto.vendorName,
        vendorGstin: dto.vendorGstin,
        invoiceRef: dto.invoiceRef,
        notes: dto.notes,
        category: dto.category,
        expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : undefined,
      },
    });
  }

  // ==========================
  // 5. REMOVE
  // ==========================
  async remove(businessId: string, id: string) {
    const expense = await this.findOne(businessId, id);

    return this.prisma.$transaction(async (tx) => {

      await tx.expense.update({
        where: { id },
        data: { deleteAt: new Date() },
      });

      const transaction = await tx.bankCashChequeTransaction.findFirst({
        where: { referenceId: id, referenceType: ReferenceType.EXPENSE, businessId },
      });

      if (transaction) {
        const account = await tx.bankCashCheque.findUnique({
          where: { id: transaction.accountId },
        });

        if (account) {
          await tx.bankCashCheque.update({
            where: { id: account.id },
            data: { closingBalance: { increment: transaction.amount } },
          });

          await tx.bankCashChequeTransaction.create({
            data: {
              businessId,
              accountId: account.id,
              transactionType: TransactionType.CREDIT,
              amount: transaction.amount,
              runningBalance: account.closingBalance.plus(transaction.amount),
              referenceId: id,
              referenceType: ReferenceType.EXPENSE,
              paymentMode: transaction.paymentMode,
              partyName: expense.vendorName,
              transactionNo: `REV-${expense.invoiceRef || 'EXP'}`,
              invoiceNo: `REVERSAL OF ${expense.invoiceRef || 'EXPENSE'}`,
            },
          });
        }
      }

      return { message: 'Expense deleted and financial ledger reversed successfully.' };
    });
  }
} // ✅ Single class closing brace at the very end
