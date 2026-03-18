import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseQueryDto } from './dto/expense-query.dto';
// IMPORT ENUMS FROM PRISMA CLIENT
import { Prisma, TransactionType, ReferenceType } from '@prisma/client'; 

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================
  // 1. CREATE
  // ==========================
  async create(businessId: string, dto: CreateExpenseDto) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { state: true }
    });
    
    if (!business) throw new NotFoundException("Business not found");

    const placeOfSupply = dto.placeOfSupply || business.state;
    const isInterState = placeOfSupply.toLowerCase() !== business.state.toLowerCase();

    // Calculations
    let totalTaxable = new Prisma.Decimal(0);
    let totalTax = new Prisma.Decimal(0);
    let grandTotal = new Prisma.Decimal(0);

    const itemsData = dto.items.map(item => {
      const taxable = new Prisma.Decimal(item.taxableAmount);
      const rate = new Prisma.Decimal(item.taxRate);
      const cess = new Prisma.Decimal(item.cessAmount || 0);

      const taxAmount = taxable.times(rate).div(100);
      const lineTotal = taxable.plus(taxAmount).plus(cess);

      totalTaxable = totalTaxable.plus(taxable);
      totalTax = totalTax.plus(taxAmount).plus(cess);
      grandTotal = grandTotal.plus(lineTotal);

      let cgst = new Prisma.Decimal(0);
      let sgst = new Prisma.Decimal(0);
      let igst = new Prisma.Decimal(0);

      if (rate.gt(0)) {
        if (isInterState) {
          igst = taxAmount;
        } else {
          cgst = taxAmount.div(2);
          sgst = taxAmount.div(2);
        }
      }

      return {
        description: item.description,
        hsnCode: item.hsnCode,
        taxableAmount: taxable,
        taxRate: rate,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: igst,
        cessAmount: cess,
        totalAmount: lineTotal
      };
    });

    return this.prisma.$transaction(async (tx) => {
      // Create Expense
      const expense = await tx.expense.create({
        data: {
          expenseNumber,
          businessId,
          expenseDate: new Date(dto.expenseDate),
          category: dto.category,
          vendorName: dto.vendorName,
          vendorGstin: dto.vendorGstin,
          placeOfSupply: placeOfSupply,
          invoiceRef: dto.invoiceRef,
          isRcmApplicable: dto.isRcmApplicable || false,
          itcClaimed: dto.itcClaimed ?? true,
          totalTaxableAmount: totalTaxable,
          totalTaxAmount: totalTax,
          totalAmount: grandTotal,
          paymentMode: dto.paymentMode,
          items: {
            create: itemsData
          }
        },
        include: { items: true }
      });

      // Deduct Money
      if (dto.accountId) {
        const account = await tx.bankCashCheque.findUnique({
          where: { id: dto.accountId, businessId }
        });

        if (!account) throw new BadRequestException("Invalid Bank/Cash Account ID");

        await tx.bankCashCheque.update({
          where: { id: account.id },
          data: { closingBalance: { decrement: grandTotal } }
        });

        await tx.bankCashChequeTransaction.create({
          data: {
            businessId,
            accountId: account.id,
            transactionType: TransactionType.DEBIT, // <--- USE ENUM
            amount: grandTotal,
            runningBalance: account.closingBalance.minus(grandTotal),
            referenceId: expense.id,
            referenceType: ReferenceType.EXPENSE, // <--- USE ENUM
            invoiceNo: dto.invoiceRef,
            paymentMode: dto.paymentMode,
            partyName: dto.vendorName || 'Expense Vendor'
          }
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
        include: { items: true }
      }),
      this.prisma.expense.count({ where })
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ==========================
  // 3. FIND ONE
  // ==========================
  async findOne(businessId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, businessId, deleteAt: null },
      include: { items: true }
    });

    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  // ==========================
  // 4. UPDATE
  // ==========================
  async update(businessId: string, id: string, dto: UpdateExpenseDto) {
    await this.findOne(businessId, id);

    // Prevent amount changes to protect ledger
    if (dto.items || dto.totalAmount) {
      throw new BadRequestException("To change amounts or items, please Delete this expense and create a new one to maintain Ledger integrity.");
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
      }
    });
  }

  // ==========================
  // 5. REMOVE
  // ==========================
  async remove(businessId: string, id: string) {
    const expense = await this.findOne(businessId, id);

    return this.prisma.$transaction(async (tx) => {
      
      // Soft Delete
      await tx.expense.update({
        where: { id },
        data: { deleteAt: new Date() }
      });

      // Find Linked Transaction
      const transaction = await tx.bankCashChequeTransaction.findFirst({
        where: { 
          referenceId: id, 
          referenceType: ReferenceType.EXPENSE, // <--- USE ENUM
          businessId 
        }
      });

      // Reverse Money Logic
      if (transaction) {
        const account = await tx.bankCashCheque.findUnique({
          where: { id: transaction.accountId }
        });

        if (account) {
          // Increase Balance back
          await tx.bankCashCheque.update({
            where: { id: account.id },
            data: { closingBalance: { increment: transaction.amount } }
          });

          // Add Reversal Entry
          await tx.bankCashChequeTransaction.create({
            data: {
              businessId,
              accountId: account.id,
              transactionType: TransactionType.CREDIT, // <--- USE ENUM
              amount: transaction.amount,
              runningBalance: account.closingBalance.plus(transaction.amount),
              referenceId: id,
              referenceType: ReferenceType.EXPENSE, // <--- USE ENUM
              paymentMode: transaction.paymentMode,
              partyName: expense.vendorName,
              transactionNo: `REV-${expense.invoiceRef || 'EXP'}`,
              invoiceNo: `REVERSAL OF ${expense.invoiceRef || 'EXPENSE'}`
            }
          });
        }
      }

      return { message: "Expense deleted and financial ledger reversed successfully." };
    });
  }
}