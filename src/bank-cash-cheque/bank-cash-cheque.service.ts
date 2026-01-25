import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  ForbiddenException 
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBankAccountDto, TransferMoneyDto, UpdateBankAccountDto } from './dto/bank-account.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class BankCashChequeService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Helper: Verify Ownership ---
  private async verifyOwnership(businessId: string, userId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true }
    });
    if (!business) throw new NotFoundException('Business not found');
    if (business.ownerId !== userId) throw new ForbiddenException('You do not own this business');
  }

  // 1. CREATE
  async create(businessId: string, userId: string, dto: CreateBankAccountDto) {
    await this.verifyOwnership(businessId, userId);

    const balanceDec = new Prisma.Decimal(dto.openingBalance || 0);

    return this.prisma.bankCashCheque.create({
      data: {
        businessId,
        accountType: dto.accountType,
        accountName: dto.accountName,
        openingBalance: balanceDec,
        closingBalance: balanceDec, // Starts same as opening
        
        bankName: dto.bankName,
        bankAccountNo: dto.bankAccountNo,
        bankIfscCode: dto.bankIfscCode,
        bankAccountHolder: dto.bankAccountHolder,
        upiId: dto.upiId,
        isDefault: dto.isDefault || false
      }
    });
  }

  // 2. GET ALL
  async findAll(businessId: string, userId: string) {
    await this.verifyOwnership(businessId, userId);

    return this.prisma.bankCashCheque.findMany({
      where: { businessId, isEnabled: true },
      orderBy: { isDefault: 'desc' }, // Defaults first
    });
  }

  // 3. GET ONE
  async findOne(businessId: string, accountId: string, userId: string) {
    await this.verifyOwnership(businessId, userId);
    return this.prisma.bankCashCheque.findFirstOrThrow({
      where: { id: accountId, businessId }
    });
  }

  // 4. UPDATE
  async update(businessId: string, accountId: string, userId: string, dto: UpdateBankAccountDto) {
    await this.verifyOwnership(businessId, userId);

    return this.prisma.bankCashCheque.update({
      where: { id: accountId },
      data: {
        accountName: dto.accountName,
        bankName: dto.bankName,
        bankAccountNo: dto.bankAccountNo,
        bankIfscCode: dto.bankIfscCode,
        bankAccountHolder: dto.bankAccountHolder,
        upiId: dto.upiId,
        isDefault: dto.isDefault
      }
    });
  }

  // 5. DELETE (Soft Delete)
  async remove(businessId: string, accountId: string, userId: string) {
    await this.verifyOwnership(businessId, userId);

    // Check if it has transactions
    const hasTx = await this.prisma.bankCashChequeTransaction.count({
      where: { accountId }
    });

    if (hasTx > 0) {
      // Soft delete: just disable it
      return this.prisma.bankCashCheque.update({
        where: { id: accountId },
        data: { isEnabled: false }
      });
    }

    // Hard delete if no history
    return this.prisma.bankCashCheque.delete({
      where: { id: accountId }
    });
  }

  // 6. TRANSFER MONEY (The Complex Logic)
  async transferMoney(businessId: string, userId: string, dto: TransferMoneyDto) {
    await this.verifyOwnership(businessId, userId);
    
    if (dto.fromAccountId === dto.toAccountId) {
      throw new BadRequestException("Cannot transfer to the same account");
    }

    const amountDec = new Prisma.Decimal(dto.amount);

    return this.prisma.$transaction(async (tx) => {
      // A. Fetch Source Account
      const fromAcc = await tx.bankCashCheque.findFirstOrThrow({
        where: { id: dto.fromAccountId, businessId }
      });

      // B. Fetch Dest Account
      const toAcc = await tx.bankCashCheque.findFirstOrThrow({
        where: { id: dto.toAccountId, businessId }
      });

      // C. Update Source (Debit)
      await tx.bankCashCheque.update({
        where: { id: fromAcc.id },
        data: { closingBalance: { decrement: amountDec } }
      });

      // D. Log Debit Transaction
      await tx.bankCashChequeTransaction.create({
        data: {
          businessId,
          accountId: fromAcc.id,
          transactionType: 'DEBIT',
          amount: amountDec,
          runningBalance: fromAcc.closingBalance.minus(amountDec),
          referenceType: 'MANUAL_ADJUSTMENT',
          transactionNo: `TRF-OUT-${Date.now()}`,
          partyName: `Transfer to ${toAcc.accountName}`,
          paymentMode: 'INTERNAL',
        }
      });

      // E. Update Dest (Credit)
      await tx.bankCashCheque.update({
        where: { id: toAcc.id },
        data: { closingBalance: { increment: amountDec } }
      });

      // F. Log Credit Transaction
      await tx.bankCashChequeTransaction.create({
        data: {
          businessId,
          accountId: toAcc.id,
          transactionType: 'CREDIT',
          amount: amountDec,
          runningBalance: toAcc.closingBalance.plus(amountDec),
          referenceType: 'MANUAL_ADJUSTMENT',
          transactionNo: `TRF-IN-${Date.now()}`,
          partyName: `Transfer from ${fromAcc.accountName}`,
          paymentMode: 'INTERNAL',
        }
      });

      return { success: true, message: 'Transfer successful' };
    });
  }
}