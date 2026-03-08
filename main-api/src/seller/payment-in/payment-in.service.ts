// src/seller/payment-in/payment-in.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePaymentInDto } from './dto/create-payment-in.dto';
import { PaymentInPaginationDto } from './dto/payment-in-pagination.dto';
import { UpdatePaymentInDto } from './dto/update-payment-in.dto';
import { Prisma, BankCashCheque } from '@prisma/client';

@Injectable()
export class PaymentInService {
  constructor(private readonly prisma: PrismaService) {}

  // ================================================================
  // PRIVATE UTILITY: Record a Bank/Cash transaction + update balance
  // Reuse this anywhere you need to debit or credit an account
  // ================================================================
  private async recordBankTransaction(
    tx: any,
    opts: {
      businessId:      string;
      account:         BankCashCheque;
      transactionType: 'CREDIT' | 'DEBIT';
      amount:          Prisma.Decimal;
      paymentMode:     string;
      partyName:       string;
      partyId?:        string | null;
      referenceId?:    string;
      referenceType?:  string;
      invoiceNo?:      string;
      transactionNo?:  string;
    },
  ): Promise<void> {
    const {
      businessId, account, transactionType, amount,
      paymentMode, partyName, partyId,
      referenceId, referenceType = 'MANUAL_ADJUSTMENT',
      invoiceNo, transactionNo,
    } = opts;

    const newBalance =
      transactionType === 'CREDIT'
        ? account.closingBalance.plus(amount)
        : account.closingBalance.minus(amount);

    // 1. Update account balance
    await tx.bankCashCheque.update({
      where: { id: account.id },
      data: {
        closingBalance:
          transactionType === 'CREDIT'
            ? { increment: amount }
            : { decrement: amount },
      },
    });

    // 2. Write ledger row
    await tx.bankCashChequeTransaction.create({
      data: {
        businessId,
        accountId:       account.id,
        transactionType,
        amount,
        runningBalance:  newBalance,
        paymentMode,
        partyName,
        ...(partyId        ? { partyId }        : {}),
        ...(referenceId    ? { referenceId }    : {}),
        ...(invoiceNo      ? { invoiceNo }      : {}),
        ...(transactionNo  ? { transactionNo }  : {}),
        referenceType:   referenceType as any,
      },
    });
  }

  // ================================================================
  // 1. GET PENDING CUSTOMERS + ALL ACCOUNTS
  // ================================================================
  async getPendingCustomers(businessId: string) {
    const [pendingSales, accounts] = await Promise.all([
      this.prisma.sale.findMany({
        where: {
          businessId,
          balanceAmount: { gt: 0 },
          status:        'FINALIZED',
          deletedAt:     null,
          partyId:       { not: null },     // walk-ins excluded
        },
        orderBy: { invoiceDate: 'asc' },
      }),

      // Return ALL enabled accounts so UI can show cash, bank, UPI together
      this.prisma.bankCashCheque.findMany({
        where:   { businessId, isEnabled: true },
        select: {
          id:             true,
          accountName:    true,
          accountType:    true,
          isDefault:      true,
          closingBalance: true,
          bankName:       true,
          upiId:          true,
        },
        orderBy: { isDefault: 'desc' },
      }),
    ]);

    // Group sales by partyId
    const groupedCustomers = pendingSales.reduce(
      (acc, sale) => {
        const partyId = sale.partyId as string;

        if (!acc[partyId]) {
          acc[partyId] = {
            customerId:          partyId,
            customerName:        sale.partyName || 'Unknown',
            customerPhone:       sale.phoneNo   || '',
            totalPendingAmount:  0,
            invoices:            [],
          };
        }

        const pendingAmount = Number(sale.balanceAmount);
        acc[partyId].totalPendingAmount += pendingAmount;
        acc[partyId].invoices.push({
          saleId:        sale.id,
          invoiceNo:     `${sale.invoicePrefix}-${sale.invoiceNo}`,
          date:          sale.invoiceDate,
          totalAmount:   Number(sale.totalAmount),
          pendingAmount,
        });

        return acc;
      },
      {} as Record<string, any>,
    );

    return {
      accounts,                              // All CASH + BANK + UPI accounts
      customers: Object.values(groupedCustomers),
    };
  }

  // ================================================================
  // 2. CREATE PAYMENT IN
  // ================================================================
  async create(businessId: string, dto: CreatePaymentInDto) {
    const amountDec = new Prisma.Decimal(dto.amount);
    const date      = new Date(dto.date);

    // ── Verify Party (not CustomerUser anymore) ───────────────────
    const party = await this.prisma.party.findFirst({
      where: { id: dto.customerId, businessId, partyType: 'CUSTOMER' },
    });
    if (!party) throw new NotFoundException('Customer (Party) not found');

    return this.prisma.$transaction(async (tx) => {

      // ── A. Resolve Target Account ─────────────────────────────────
      let targetAccount: BankCashCheque | null = null;

      if (dto.depositAccountId) {
        targetAccount = await tx.bankCashCheque.findFirst({
          where: { id: dto.depositAccountId, businessId, isEnabled: true },
        });
        if (!targetAccount) {
          throw new BadRequestException('Selected deposit account is invalid or disabled.');
        }
      } else {
        const typeFilter =
          dto.paymentMode === 'CASH' ? 'CASH' : { in: ['BANK', 'UPI'] };
        targetAccount = await tx.bankCashCheque.findFirst({
          where: { businessId, accountType: typeFilter as any, isEnabled: true },
          orderBy: { isDefault: 'desc' },
        });
        if (!targetAccount) {
          throw new BadRequestException('No valid Cash/Bank account found.');
        }
      }

      const receiptNo = `RCP-${Date.now()}`;

      // ── B. Record Bank Transaction (shared utility) ───────────────
      await this.recordBankTransaction(tx, {
        businessId,
        account:         targetAccount,
        transactionType: 'CREDIT',
        amount:          amountDec,
        paymentMode:     dto.paymentMode,
        partyName:       party.partyName,
        partyId:         party.id,
        referenceId:     dto.saleId   || undefined,
        referenceType:   dto.saleId   ? 'SALE' : 'MANUAL_ADJUSTMENT',
        invoiceNo:       receiptNo,
        transactionNo:   receiptNo,
      });

      // ── C. Party Ledger Credit Entry ──────────────────────────────
      const paymentEntry = await tx.partyLedger.create({
        data: {
          businessId,
          partyId:         party.id,            // ← correct FK → Party
          partyType:       'CUSTOMER',
          partyName:       party.partyName,
          phoneNo:         party.phoneNo  || null,
          email:           party.email    || null,
          gstin:           party.taxId    || null,
          transactionDate: date,
          description:     dto.notes || `Payment received via ${dto.paymentMode} — ${receiptNo}`,
          credit:          amountDec,
          debit:           new Prisma.Decimal(0),
          linkedSaleId:    dto.saleId || null,
        },
      });

      // ── D. Settle Invoice if saleId provided ──────────────────────
      if (dto.saleId) {
        const sale = await tx.sale.findUnique({ where: { id: dto.saleId } });
        if (!sale) throw new BadRequestException('Invoice not found.');

        // Security check — invoice must belong to this party & business
        if (sale.partyId !== party.id || sale.businessId !== businessId) {
          throw new BadRequestException('Invoice does not belong to this customer.');
        }

        const newBalance = new Prisma.Decimal(sale.balanceAmount).minus(amountDec);
        const isSettled  = newBalance.lte(0);

        await tx.sale.update({
          where: { id: dto.saleId },
          data: {
            balanceAmount: newBalance.lessThan(0) ? new Prisma.Decimal(0) : newBalance,
            isSettled,
            salePaymentModes: {
              create: {
                bankCashChequeId: targetAccount.id,
                accountName:      targetAccount.accountName,
                paymentMode:      dto.paymentMode,
                amount:           amountDec,
                ifsc:             targetAccount.bankIfscCode  ?? '',
                acNo:             targetAccount.bankAccountNo ?? '',
              },
            },
          },
        });

        // Update Party.closingBalance (reduce outstanding)
        await tx.party.update({
          where: { id: party.id },
          data:  { closingBalance: { decrement: amountDec } },
        });
      }

      return paymentEntry;
    });
  }

  // ================================================================
  // 3. GET ALL PAYMENTS (Paginated)
  // ================================================================
  async findAll(businessId: string, query: PaymentInPaginationDto) {
    const { page = 1, limit = 10, search, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PartyLedgerWhereInput = {
      businessId,
      partyType: 'CUSTOMER',
      credit:    { gt: 0 },
    };

    if (search) {
      where.partyName = { contains: search, mode: 'insensitive' };
    }
    if (startDate || endDate) {
      where.transactionDate = {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate   ? new Date(endDate)   : undefined,
      };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.partyLedger.findMany({ where, skip, take: limit, orderBy: { transactionDate: 'desc' } }),
      this.prisma.partyLedger.count({ where }),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ================================================================
  // 4. GET ONE
  // ================================================================
  async findOne(businessId: string, id: string) {
    const entry = await this.prisma.partyLedger.findFirst({
      where: { id, businessId, partyType: 'CUSTOMER' },
    });
    if (!entry) throw new NotFoundException('Payment entry not found');
    return entry;
  }

  // ================================================================
  // 5. UPDATE (notes/date only — amount changes require delete+create)
  // ================================================================
  async update(businessId: string, id: string, dto: UpdatePaymentInDto) {
    if (dto.amount) {
      throw new BadRequestException(
        'To change the amount, delete this payment and create a new one to maintain ledger integrity.',
      );
    }
    return this.prisma.partyLedger.update({
      where: { id },
      data: {
        transactionDate: dto.date  ? new Date(dto.date) : undefined,
        description:     dto.notes ?? undefined,
      },
    });
  }

  // ================================================================
  // 6. DELETE / VOID PAYMENT
  // ================================================================
  async remove(businessId: string, id: string) {
    const entry = await this.findOne(businessId, id);

    return this.prisma.$transaction(async (tx) => {
      // A. Remove ledger entry
      await tx.partyLedger.delete({ where: { id } });

      // B. Revert Sale balance if linked
      if (entry.linkedSaleId) {
        await tx.sale.update({
          where: { id: entry.linkedSaleId },
          data: {
            balanceAmount: { increment: entry.credit },
            isSettled:     false,
          },
        });

        // Revert Party.closingBalance
        if (entry.partyId) {
          await tx.party.update({
            where: { id: entry.partyId },
            data:  { closingBalance: { increment: entry.credit } },
          });
        }
      }

      // C. Reverse the bank entry using the shared utility
      const account = await tx.bankCashCheque.findFirst({
        where: { businessId, isDefault: true, isEnabled: true },
      });

      if (account) {
        await this.recordBankTransaction(tx, {
          businessId,
          account,
          transactionType: 'DEBIT',
          amount:          new Prisma.Decimal(entry.credit),
          paymentMode:     'MANUAL_ADJUSTMENT',
          partyName:       entry.partyName,
          partyId:         entry.partyId ?? undefined,
          referenceId:     entry.linkedSaleId ?? undefined,
          referenceType:   'MANUAL_ADJUSTMENT',
          transactionNo:   `REV-${Date.now()}`,
          invoiceNo:       'VOID-PAYMENT',
        });
      }

      return { success: true, message: 'Payment voided and ledger reversed.' };
    });
  }
}
