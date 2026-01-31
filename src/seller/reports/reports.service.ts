import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BankCashCheque, FixedAsset, PartyLedger, Prisma } from '@prisma/client';
import { CreateCapitalDto, CreateFixedAssetDto, CreateInvestmentDto, CreateLoanAdvanceDto, CreateLoanDto, CreateLoanLiabilityDto, CreateTaxPayableDto } from './dto/balance-sheet-entry.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

 // ==================================================================
  // 1. GET BALANCE SHEET (IMPROVED)
  // ==================================================================
  async getBalanceSheet(businessId: string) {
    // Sequential awaits to avoid connection pool exhaustion
    const inventory = await this.prisma.variant.findMany({
      where: { product: { businessId }, deletedAt: null },
      select: { stock: true, purchasePrice: true }
    });
    
    // Fetch individual accounts to show detailed breakdown
    const accounts = await this.prisma.bankCashCheque.findMany({
      where: { businessId, isEnabled: true }
    });
    
    const parties = await this.prisma.partyLedger.findMany({
      where: { businessId }
    });

    const taxes = await this.prisma.taxEntry.findMany({
      where: { businessId, isFiled: false }
    });

    const fixedAssets = await this.prisma.fixedAsset.findMany({
      where: { businessId, isActive: true }
    });
    
    const pnl = await this.calculateNetIncome(businessId);

    // --- 2. Process ASSETS ---
    const inventoryValue = inventory.reduce((sum, item) => sum + (item.stock * Number(item.purchasePrice || 0)), 0);
    
    // Cash, Bank, and Loan Liabilities
    const cashInHand = accounts.filter(a => a.accountType === 'CASH' && Number(a.closingBalance) > 0)
                                .reduce((sum, a) => sum + Number(a.closingBalance), 0);
    const cashInBank = accounts.filter(a => a.accountType === 'BANK' && Number(a.closingBalance) > 0)
                               .reduce((sum, a) => sum + Number(a.closingBalance), 0);
    const loansLiability = accounts.filter(a => Number(a.closingBalance) < 0)
                                   .map(a => ({ name: a.accountName, amount: Math.abs(Number(a.closingBalance)) }));
    const totalLoansLiability = loansLiability.reduce((sum, l) => sum + l.amount, 0);

    // Receivables (Debtors) & Payables (Creditors)
    const partyBalances = parties.reduce((acc, p) => {
      const net = (Number(p.debit) || 0) - (Number(p.credit) || 0);
      acc[p.partyName] = (acc[p.partyName] || 0) + net;
      return acc;
    }, {} as Record<string, number>);

    let accountsReceivable = 0, accountsPayable = 0;
    for (const name in partyBalances) {
      if (partyBalances[name] > 0) accountsReceivable += partyBalances[name];
      else accountsPayable += Math.abs(partyBalances[name]);
    }
    
    // Tax Assets
    const taxReceivable = taxes.filter(t => t.type.includes('RECEIVABLE')).reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const fixedAssetsList = fixedAssets.map(a => ({ id: a.id, name: a.name, amount: Number(a.currentValue) }));
    const investments = fixedAssetsList.filter(a => a.name.startsWith("Investment:"));
    const otherFixedAssets = fixedAssetsList.filter(a => !a.name.startsWith("Investment:"));

    const totalAssets = cashInHand + cashInBank + accountsReceivable + inventoryValue + taxReceivable + fixedAssets.reduce((sum, a) => sum + Number(a.currentValue), 0);
    
    // --- 3. Process LIABILITIES ---
    const taxPayable = taxes.filter(t => t.type.includes('PAYABLE')).reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalCurrentLiabilities = accountsPayable + taxPayable;
    const totalLiabilities = totalCurrentLiabilities + totalLoansLiability;

    // --- 4. Process EQUITY ---
    const netIncome = pnl;
    const capital = totalAssets - totalLiabilities - netIncome;

    return {
      assets: {
        currentAssets: { total: cashInHand + cashInBank + accountsReceivable + inventoryValue + taxReceivable, taxReceivable, cashInHand, cashInBank, accountsReceivable, inventoryInHand: inventoryValue },
        fixedAssets: { total: otherFixedAssets.reduce((sum, a) => sum + a.amount, 0), list: otherFixedAssets },
        investments: { total: investments.reduce((sum, a) => sum + a.amount, 0), list: investments },
        loansAdvance: { total: 0, list: [] }, // You can create a ledger for this if needed
        totalAssets
      },
      liabilities: {
        capital: { total: capital, list: [{ name: 'Owner\'s Capital (Balancing Figure)', amount: capital }] }, // Capital is now a detailed list
        currentLiability: { total: totalCurrentLiabilities, taxPayable, tcsPayable: 0, tdsPayable: 0, accountPayable: accountsPayable },
        loans: { total: totalLoansLiability, list: loansLiability },
        netIncome,
        totalLiabilities
      }
    };
  }

  // ... [keep calculateNetIncome] ...

  // ==================================================================
  // "ADD NEW ENTRY" APIs
  // ==================================================================

  // 1. ADD CAPITAL
  async addCapital(businessId: string, dto: CreateCapitalDto) {
    const amountDec = new Prisma.Decimal(dto.amount);
    // Capital is essentially money coming into the business
    return this.prisma.$transaction(async (tx) => {
        const cashAccount = await tx.bankCashCheque.findFirst({
            where: { businessId, isDefault: true, accountType: { in: ['BANK', 'CASH'] } }
        });
        if (!cashAccount) throw new BadRequestException("No default cash/bank account found.");

        await tx.bankCashCheque.update({
            where: { id: cashAccount.id },
            data: { closingBalance: { increment: amountDec } }
        });
        
        return tx.bankCashChequeTransaction.create({
            data: {
                businessId, accountId: cashAccount.id, transactionType: 'CREDIT',
                amount: amountDec, runningBalance: cashAccount.closingBalance.plus(amountDec),
                referenceType: 'MANUAL_ADJUSTMENT', partyName: dto.sourceName
            }
        });
    });
  }

// 2. ADD TAX PAYABLE (Fixed for Schema Constraints)
  async addTaxPayable(businessId: string, dto: CreateTaxPayableDto) {
    return this.prisma.taxEntry.create({
      data: {
        businessId,
        type: dto.taxType as any,
        amount: new Prisma.Decimal(dto.amount),
        
        // --- FIX: Provide required missing fields ---
        rate: new Prisma.Decimal(0),            // Default rate to 0 for manual entries
        referenceId: `MANUAL-${Date.now()}`,    // Generate a unique dummy reference ID
        // --------------------------------------------
        
        partyName: dto.description,
        referenceType: 'MANUAL_ADJUSTMENT'
      }
    });
  }

  // 3. ADD FIXED ASSET
  async addFixedAsset(businessId: string, dto: CreateFixedAssetDto) {
    const priceDec = new Prisma.Decimal(dto.purchasePrice);
    return this.prisma.fixedAsset.create({
      data: {
        businessId, name: dto.name, purchaseDate: new Date(dto.purchaseDate),
        purchasePrice: priceDec, currentValue: priceDec, depreciationRate: dto.depreciationRate
      }
    });
  }

  // ... [keep addLoanLiability, addLoanAdvance, addInvestment] ...

  // ==================================================================
  // UPDATE / DELETE APIs
  // ==================================================================

  async deleteFixedAsset(businessId: string, assetId: string) {
    const asset = await this.prisma.fixedAsset.findFirst({
      where: { id: assetId, businessId }
    });
    if (!asset) throw new NotFoundException('Asset not found.');

    // Soft delete is better for assets, but for MVP, hard delete is fine.
    await this.prisma.fixedAsset.delete({ where: { id: assetId } });
    return { success: true, message: 'Asset deleted.' };
  }


  // Helper to calculate P&L on the fly
  private async calculateNetIncome(businessId: string) {
    // --- FIX: Replaced Promise.all with sequential awaits ---
    const sales = await this.prisma.sale.aggregate({ 
      where: { businessId, status: 'FINALIZED' }, 
      _sum: { totalAmount: true } 
    });
    const purchases = await this.prisma.purchase.aggregate({ 
      where: { businessId, status: 'RECEIVED' }, 
      _sum: { totalAmount: true } 
    });
    const expenses = await this.prisma.expense.aggregate({ 
      where: { businessId, category: { not: 'DRAWINGS' } },
      _sum: { totalAmount: true } 
    });

    const revenue = Number(sales._sum.totalAmount) || 0;
    const cogs = Number(purchases._sum.totalAmount) || 0;
    const opex = Number(expenses._sum.totalAmount) || 0;

    return revenue - cogs - opex;
  }

   // ==================================================================
  // BALANCE SHEET "ADD ENTRY" APIs
  // ==================================================================



  // 2. ADD LOAN (Creates a negative balance account)
  async addLoan(businessId: string, dto: CreateLoanDto) {
    // A loan is a "liability account" in your Bank/Cash table with a negative balance.
    // We create a new Bank account to track this specific loan.

    // A. Verify a loan with this name doesn't exist
    const existing = await this.prisma.bankCashCheque.findFirst({
      where: { businessId, accountName: dto.loanName }
    });
    if (existing) throw new BadRequestException("An account with this name already exists.");

    const amountDec = new Prisma.Decimal(dto.amount);
    
    // B. Create the Loan Account and Deposit the money into Cash/Bank
    return this.prisma.$transaction(async (tx) => {
      // Step 1: Create the Loan Liability Account
      // Its balance is NEGATIVE because we owe this money.
      const loanAccount = await tx.bankCashCheque.create({
        data: {
          businessId,
          accountType: 'BANK', // Loans are treated as Bank type accounts
          accountName: dto.loanName,
          isEnabled: true,
          // Balance is negative because it's a liability
          closingBalance: amountDec.negated(),
          openingBalance: amountDec.negated(),
        }
      });
      
      // Step 2: Find where the cash from the loan went (e.g., Main Bank Account)
      const cashAccount = await tx.bankCashCheque.findFirst({
        where: { businessId, isDefault: true, accountType: { in: ['BANK', 'CASH'] } },
      });

      if (!cashAccount) throw new BadRequestException("No default Cash/Bank account to deposit loan into.");
      
      // Step 3: Increase the balance of your main account (Money came in)
      await tx.bankCashCheque.update({
        where: { id: cashAccount.id },
        data: { closingBalance: { increment: amountDec } }
      });
      
      // Step 4: Log the transaction for audit
      await tx.bankCashChequeTransaction.create({
        data: {
          businessId,
          accountId: cashAccount.id,
          transactionType: 'CREDIT',
          amount: amountDec,
          runningBalance: cashAccount.closingBalance.plus(amountDec),
          referenceType: 'MANUAL_ADJUSTMENT',
          partyName: `Loan from ${dto.loanName}`,
          paymentMode: 'BANK_TRANSFER'
        }
      });

      return loanAccount;
    });
  }

    async addLoanLiability(businessId: string, dto: CreateLoanLiabilityDto): Promise<BankCashCheque> {
    const amountDec = new Prisma.Decimal(dto.amount);
    
    return this.prisma.$transaction(async (tx) => {
      // Step 1: Create the Loan Liability Account (Negative Balance)
      const loanAccount = await tx.bankCashCheque.create({
        data: {
          businessId,
          accountType: 'BANK',
          accountName: `Loan: ${dto.loanName}`,
          isEnabled: true,
          closingBalance: amountDec.negated(),
          openingBalance: amountDec.negated(),
        }
      });
      
      // Step 2: Deposit the received cash into the default Bank/Cash account
      const cashAccount = await tx.bankCashCheque.findFirst({
        where: { businessId, isDefault: true, accountType: { in: ['BANK', 'CASH'] } },
      });

      if (!cashAccount) throw new BadRequestException("No default Cash/Bank account to deposit loan into.");
      
      await tx.bankCashCheque.update({
        where: { id: cashAccount.id },
        data: { closingBalance: { increment: amountDec } }
      });
      
      // Step 3: Log the transaction
      await tx.bankCashChequeTransaction.create({
        data: {
          businessId,
          accountId: cashAccount.id,
          transactionType: 'CREDIT',
          amount: amountDec,
          runningBalance: cashAccount.closingBalance.plus(amountDec),
          referenceType: 'MANUAL_ADJUSTMENT',
          partyName: `Loan from ${dto.loanName}`
        }
      });

      return loanAccount;
    });
  }

  // 2. ADD LOAN ADVANCE (ASSET)
  async addLoanAdvance(businessId: string, dto: CreateLoanAdvanceDto): Promise<PartyLedger> {
    const amountDec = new Prisma.Decimal(dto.amount);

    return this.prisma.$transaction(async (tx) => {
      // Step 1: Deduct money from the Cash/Bank account
      const cashAccount = await tx.bankCashCheque.findFirst({
        where: { businessId, isDefault: true, accountType: { in: ['BANK', 'CASH'] } },
      });

      if (!cashAccount) throw new BadRequestException("No default Cash/Bank account to fund the loan from.");
      if (Number(cashAccount.closingBalance) < dto.amount) throw new BadRequestException("Insufficient balance to give loan.");

      await tx.bankCashCheque.update({
        where: { id: cashAccount.id },
        data: { closingBalance: { decrement: amountDec } }
      });

      // Step 2: Create a Party Ledger entry showing they owe us money
      // We treat "Loan Advances" as a special type of "Customer"
      return tx.partyLedger.create({
        data: {
          businessId,
          partyType: 'CUSTOMER', // Technically it's a debtor, Customer type works
          partyName: `Advance to: ${dto.partyName}`,
          transactionDate: new Date(),
          description: `Loan Given / Advance`,
          debit: amountDec, // Debit = They owe us
          credit: 0,
        }
      });
    });
  }

  // 3. ADD INVESTMENT (ASSET)
  async addInvestment(businessId: string, dto: CreateInvestmentDto): Promise<FixedAsset> {
    // We can reuse the FixedAsset table to track investments
    // by simply changing the name and depreciation logic.
    const amountDec = new Prisma.Decimal(dto.amount);
    
    return this.prisma.$transaction(async (tx) => {
      // Step 1: Deduct money from the Bank account
      const bankAccount = await tx.bankCashCheque.findFirst({
        where: { businessId, isDefault: true, accountType: 'BANK' },
      });
      if (!bankAccount) throw new BadRequestException("No default Bank account to fund the investment from.");

      await tx.bankCashCheque.update({
        where: { id: bankAccount.id },
        data: { closingBalance: { decrement: amountDec } }
      });

      // Step 2: Create a record in FixedAsset to track it
      return tx.fixedAsset.create({
        data: {
          businessId,
          name: `Investment: ${dto.investmentName}`,
          purchaseDate: new Date(),
          purchasePrice: amountDec,
          currentValue: amountDec,
          depreciationRate: 0 // Investments don't depreciate, they appreciate/fluctuate
        }
      });
    });
}

async deleteLoan(businessId: string, loanId: string) {
  // 1. Find the loan account by ID (ID is safer than name for deletion)
  const loanAccount = await this.prisma.bankCashCheque.findFirst({
    where: { 
      id: loanId,
      businessId, 
    }
  });

  if (!loanAccount) {
    throw new NotFoundException('Loan account not found.');
  }

  return this.prisma.$transaction(async (tx) => {
    // 2. OPTIONAL REVERSAL: If the loan had a balance, handle the cash reversal
    // (This part is from your original logic)
    const loanAmount = Math.abs(Number(loanAccount.closingBalance));
    if (loanAmount > 0) {
      const mainAccount = await tx.bankCashCheque.findFirst({
        where: { businessId, isDefault: true, accountType: { in: ['BANK', 'CASH'] } }
      });

      if (mainAccount) {
        await tx.bankCashCheque.update({
          where: { id: mainAccount.id },
          data: { closingBalance: { decrement: loanAmount } }
        });

        await tx.bankCashChequeTransaction.create({
          data: {
            businessId,
            accountId: mainAccount.id,
            transactionType: 'DEBIT',
            amount: new Prisma.Decimal(loanAmount),
            runningBalance: mainAccount.closingBalance.minus(loanAmount),
            referenceType: 'MANUAL_ADJUSTMENT',
            partyName: `System: Deleted Loan ${loanAccount.accountName}`,
            paymentMode: 'INTERNAL'
          }
        });
      }
    }

    // --- FIX: CLEAR DEPENDENCIES BEFORE DELETING THE ACCOUNT ---
    
    // 3. Delete all transactions linked to THIS specific loan account
    await tx.bankCashChequeTransaction.deleteMany({
      where: { accountId: loanAccount.id }
    });

    // 4. Delete any Sale Payment Modes linked to this account (if any)
    await tx.salePaymentMode.deleteMany({
      where: { bankCashChequeId: loanAccount.id }
    });

    // 5. Finally, delete the loan account itself
    await tx.bankCashCheque.delete({ 
      where: { id: loanAccount.id } 
    });

    return { success: true, message: 'Loan and related history removed successfully.' };
  });
}
}