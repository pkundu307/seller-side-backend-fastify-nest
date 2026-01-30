import { 
  BadRequestException, 
  Injectable, 
  NotFoundException 
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePaymentInDto } from './dto/create-payment-in.dto';
import { PaymentInPaginationDto } from './dto/payment-in-pagination.dto';
import { UpdatePaymentInDto } from './dto/update-payment-in.dto';
import { Prisma, BankCashCheque } from '@prisma/client';

@Injectable()
export class PaymentInService {
  constructor(private readonly prisma: PrismaService) {}

// ==================================================================
  // 1. GET PENDING CUSTOMERS & SELLER ACCOUNTS (For Payment In Page)
  // ==================================================================
  async getPendingCustomers(businessId: string) {
    // We use Promise.all to fetch both datasets in parallel for speed
    const [pendingSales, accounts] = await Promise.all([
      // A. Fetch Unpaid Sales
      this.prisma.sale.findMany({
        where: {
          businessId,
          balanceAmount: { gt: 0 }, // Owe money
          status: 'FINALIZED',
          deletedAt: null,
          partyId: { not: '' } // Must be linked to a party
        },
        orderBy: { invoiceDate: 'asc' }
      }),

      // B. Fetch Seller's Active Bank/Cash Accounts
      this.prisma.bankCashCheque.findMany({
        where: { 
          businessId, 
          isEnabled: true 
        },
        select: {
          id: true,
          accountName: true,
          accountType: true, // 'BANK', 'CASH', etc.
          isDefault: true,
          closingBalance: true // Optional: if you want to show current balance in dropdown
        },
        orderBy: { isDefault: 'desc' } // Default account first
      })
    ]);

    // C. Group Sales by Customer
    const groupedCustomers = pendingSales.reduce((acc, sale) => {
      const customerId = sale.partyId;
      
      if (!acc[customerId]) {
        acc[customerId] = {
          customerId: customerId,
          customerName: sale.partyName || 'Unknown',
          customerPhone: sale.phoneNo || '',
          totalPendingAmount: 0,
          invoices: []
        };
      }

      const pendingAmount = Number(sale.balanceAmount);
      
      // Update totals
      acc[customerId].totalPendingAmount += pendingAmount;
      
      // Add invoice details
      acc[customerId].invoices.push({
        saleId: sale.id,
        invoiceNo: `${sale.invoicePrefix}-${sale.invoiceNo}`,
        date: sale.invoiceDate,
        totalAmount: Number(sale.totalAmount),
        pendingAmount: pendingAmount
      });

      return acc;
    }, {} as Record<string, any>);

    // D. Return Combined Response
    return {
      accounts: accounts, // Populates the "Deposit To" dropdown
      customers: Object.values(groupedCustomers) // Populates the Customer list
    };
  }

  // ==================================================================
  // 2. CREATE PAYMENT IN (With Invoice Settlement)
  // ==================================================================
// ==================================================================
  // 2. CREATE PAYMENT IN (With Debug Logs)
  // ==================================================================
  async create(businessId: string, dto: CreatePaymentInDto) {
    console.log('\n--- [PaymentIn] START CREATE ---');
    console.log('1. Payload Received:', JSON.stringify(dto, null, 2));
    console.log('2. Business ID:', businessId);

    const amountDec = new Prisma.Decimal(dto.amount);
    const date = new Date(dto.date);

    // Verify Customer
    const customer = await this.prisma.customerUser.findUnique({
      where: { id: dto.customerId }
    });
    if (!customer) {
      console.error('[PaymentIn] Error: Customer not found', dto.customerId);
      throw new NotFoundException('Customer not found');
    }
    console.log('3. Customer Verified:', customer.name);

    return this.prisma.$transaction(async (tx) => {
      // --- A. Identify Target Account (Shop Cash/Bank) ---
      let targetAccount: BankCashCheque | null = null;

      if (dto.depositAccountId) {
        targetAccount = await tx.bankCashCheque.findFirst({
          where: { id: dto.depositAccountId, businessId, isEnabled: true }
        });
      } else {
        const type = dto.paymentMode === 'CASH' ? 'CASH' : { in: ['BANK', 'UPI'] };
        targetAccount = await tx.bankCashCheque.findFirst({
          where: { businessId, accountType: type as any, isEnabled: true },
          orderBy: { isDefault: 'desc' }
        });
      }

      if (!targetAccount) {
        console.error('[PaymentIn] Error: No Target Account Found');
        throw new BadRequestException("No valid Cash/Bank account found.");
      }
      console.log('4. Target Account Found:', targetAccount.accountName);

      // --- B. Update Shop Ledger ---
      const receiptNo = `RCP-${Date.now()}`; 
      await tx.bankCashCheque.update({
        where: { id: targetAccount.id },
        data: { closingBalance: { increment: amountDec } }
      });
      console.log('5. Shop Ledger Updated (Incremented)');

      await tx.bankCashChequeTransaction.create({
        data: {
          businessId,
          accountId: targetAccount.id,
          transactionType: 'CREDIT',
          amount: amountDec,
          runningBalance: targetAccount.closingBalance.plus(amountDec),
          referenceType: 'MANUAL_ADJUSTMENT', 
          transactionNo: receiptNo,
          paymentMode: dto.paymentMode,
          partyName: customer.name,
          invoiceNo: receiptNo 
        }
      });

      // --- D. Update Party Ledger ---
      const paymentEntry = await tx.partyLedger.create({
        data: {
          businessId,
          partyType: 'CUSTOMER',
          referenceId: dto.customerId,
          partyName: customer.name,
          transactionDate: date,
          description: dto.notes || `Payment Received (${dto.paymentMode})`,
          credit: amountDec, 
          debit: 0,
          linkedSaleId: dto.saleId || null 
        }
      });
      console.log('6. Party Ledger Entry Created');

      // --- E. Settle Specific Invoice ---
      if (dto.saleId) {
        console.log(`7. >> Settling Invoice ID: ${dto.saleId}`);
        
        const sale = await tx.sale.findUnique({ where: { id: dto.saleId } });
        
        if (!sale) {
            console.error('[PaymentIn] Error: Sale ID not found in DB');
            throw new BadRequestException("Invalid Sale ID");
        }
        
        console.log(`   >> Sale Found. PartyID in Sale: ${sale.partyId}, DTO CustomerID: ${dto.customerId}`);

        if (sale.partyId !== dto.customerId) {
           console.error('[PaymentIn] Mismatch: Invoice does not belong to customer');
           throw new BadRequestException("Invoice owner mismatch");
        }

        const currentBalance = new Prisma.Decimal(sale.balanceAmount);
        const newBalance = currentBalance.minus(amountDec);
        
        console.log('   >> MATH CHECK:');
        console.log(`      Current Balance: ${currentBalance}`);
        console.log(`      Paying Amount:   ${amountDec}`);
        console.log(`      New Balance:     ${newBalance}`);

        const isFullyPaid = newBalance.lessThanOrEqualTo(0);

        // Update Sale
        const updatedSale = await tx.sale.update({
          where: { id: dto.saleId },
          data: {
            balanceAmount: newBalance,
            isSettled: isFullyPaid,
            salePaymentModes: {
              create: {
                bankCashChequeId: targetAccount.id,
                accountName: targetAccount.accountName,
                paymentMode: dto.paymentMode,
                amount: amountDec,
                ifsc: '', acNo: ''
              }
            }
          }
        });
        console.log('8. >> Sale Updated Successfully. New Balance stored:', updatedSale.balanceAmount.toString());

      } else {
        console.warn('7. >> WARNING: No saleId provided in DTO. Skipping Invoice Balance Reduction.');
      }

      console.log('--- [PaymentIn] END SUCCESS ---\n');
      return paymentEntry;
    });
  }
  // 2. GET ALL (Paginated)
  async findAll(businessId: string, query: PaymentInPaginationDto) {
    const { page = 1, limit = 10, search, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PartyLedgerWhereInput = {
      businessId,
      partyType: 'CUSTOMER',
      credit: { gt: 0 }, 
    };

    if (search) {
      where.partyName = { contains: search, mode: 'insensitive' };
    }

    if (startDate || endDate) {
      where.transactionDate = {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
      };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.partyLedger.findMany({
        where,
        skip,
        take: limit,
        orderBy: { transactionDate: 'desc' },
      }),
      this.prisma.partyLedger.count({ where })
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  // 3. GET ONE
  async findOne(businessId: string, id: string) {
    const entry = await this.prisma.partyLedger.findFirst({
      where: { id, businessId, partyType: 'CUSTOMER' }
    });
    if (!entry) throw new NotFoundException('Payment entry not found');
    return entry;
  }

  // 4. UPDATE
  async update(businessId: string, id: string, dto: UpdatePaymentInDto) {
    if (dto.amount) {
       throw new BadRequestException("To change the amount, please delete this payment and create a new one to ensure ledger integrity.");
    }

    return this.prisma.partyLedger.update({
      where: { id },
      data: {
        transactionDate: dto.date ? new Date(dto.date) : undefined,
        description: dto.notes
      }
    });
  }

  // 5. DELETE (Void Payment)
  async remove(businessId: string, id: string) {
    const entry = await this.findOne(businessId, id);
    
    return this.prisma.$transaction(async (tx) => {
      await tx.partyLedger.delete({ where: { id } });

      const account = await tx.bankCashCheque.findFirst({
        where: { businessId, isDefault: true } 
      });

      // C. Revert Sale Balance if linked
      if (entry.linkedSaleId) {
         await tx.sale.update({
            where: { id: entry.linkedSaleId },
            data: {
               balanceAmount: { increment: entry.credit },
               isSettled: false,
               // FIX 6: Removed 'paymentStatus' here as well
            }
         });
      }

      if (account) {
        await tx.bankCashCheque.update({
          where: { id: account.id },
          data: { closingBalance: { decrement: entry.credit } } 
        });

        await tx.bankCashChequeTransaction.create({
          data: {
            businessId,
            accountId: account.id,
            transactionType: 'DEBIT',
            amount: entry.credit,
            runningBalance: account.closingBalance.minus(entry.credit),
            referenceType: 'MANUAL_ADJUSTMENT',
            transactionNo: `REV-${Date.now()}`,
            partyName: entry.partyName,
            invoiceNo: 'VOID-PAYMENT'
          }
        });
      }
      
      return { success: true, message: 'Payment voided and ledger adjusted.' };
    });
  }
}