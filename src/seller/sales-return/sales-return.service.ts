import { 
  BadRequestException, 
  Injectable, 
  NotFoundException 
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSalesReturnDto, ReturnAction } from './dto/create-sales-return.dto';
import { SalesReturnPaginationDto } from './dto/sales-return-pagination.dto';
import { Prisma, BankCashCheque } from '@prisma/client';

@Injectable()
export class SalesReturnService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================================================================
  // 1. CREATE SALES RETURN (CREDIT NOTE)
  // ==================================================================
  async create(businessId: string, dto: CreateSalesReturnDto) {
    // 1. Fetch Original Sale
    const sale = await this.prisma.sale.findUnique({
      where: { id: dto.saleId },
      include: { saleItems: true }
    });

    if (!sale || sale.businessId !== businessId) {
      throw new NotFoundException("Original Sale not found.");
    }

    // 2. Validate Items & Calculate Refund Amount
    let refundAmountDec = new Prisma.Decimal(0);
    let taxReversalDec = new Prisma.Decimal(0);

    for (const returnItem of dto.items) {
      // Find item in original sale to get the Price AT THAT TIME
      const originalItem = sale.saleItems.find(i => i.itemId === returnItem.variantId);
      
      if (!originalItem) {
        throw new BadRequestException(`Item ${returnItem.variantId} was not in the original invoice.`);
      }
      
      if (Number(originalItem.quantity) < returnItem.quantity) {
        throw new BadRequestException(`Cannot return more than purchased. Sold: ${originalItem.quantity}, Returning: ${returnItem.quantity}`);
      }

      // Calculate value based on original selling price
      const itemTotal = originalItem.price.times(returnItem.quantity);
      refundAmountDec = refundAmountDec.plus(itemTotal);
      
      // Approximate tax reversal (simplified)
      // For precise tax, you'd calculate based on original tax rate
      // taxReversalDec = taxReversalDec.plus(...) 
    }

    return this.prisma.$transaction(async (tx) => {
      // --- A. Generate Credit Note Number ---
      const cnNo = `CN-${Date.now().toString().slice(-6)}`;

      // --- B. Create Credit Note Record ---
      const creditNote = await tx.creditNote.create({
        data: {
          businessId,
          saleId: dto.saleId,
          noteNo: cnNo,
          date: new Date(),
          reason: dto.reason || 'Customer Return',
          amount: refundAmountDec,
          taxAmount: taxReversalDec,
          status: 'ACTIVE'
        }
      });

      // --- C. Handle Inventory (Stock Increase) ---
      for (const item of dto.items) {
        await tx.variant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } }
        });
      }

      // --- D. Handle Financials (Refund or Ledger) ---
      
      if (dto.action === ReturnAction.ADJUST_LEDGER) {
        // Option 1: Adjust Party Ledger (Reduce their debt)
        if (!sale.partyId) throw new BadRequestException("Cannot adjust ledger for anonymous customer.");

        await tx.partyLedger.create({
          data: {
            businessId,
            partyType: 'CUSTOMER',
            referenceId: sale.partyId, // Link to Customer
            partyName: sale.partyName,
            transactionDate: new Date(),
            description: `Sales Return (CN #${cnNo})`,
            credit: refundAmountDec, // Credit reduces their Debit (Owed) balance
            debit: 0,
            linkedSaleId: sale.id
          }
        });

      } else {
        // Option 2: Refund Money (Cash/Online)
        let targetAccount: BankCashCheque | null = null;

        if (dto.refundAccountId) {
           targetAccount = await tx.bankCashCheque.findFirst({ where: { id: dto.refundAccountId } });
        } else {
           // Auto-discovery
           const type = dto.action === ReturnAction.REFUND_CASH ? 'CASH' : { in: ['BANK', 'UPI'] };
           targetAccount = await tx.bankCashCheque.findFirst({
             where: { businessId, accountType: type as any, isEnabled: true },
             orderBy: { isDefault: 'desc' }
           });
        }

        if (targetAccount) {
          // Decrement Shop Balance
          await tx.bankCashCheque.update({
            where: { id: targetAccount.id },
            data: { closingBalance: { decrement: refundAmountDec } }
          });

          // Log Transaction
          await tx.bankCashChequeTransaction.create({
            data: {
              businessId,
              accountId: targetAccount.id,
              transactionType: 'DEBIT', // Money Leaving Shop
              amount: refundAmountDec,
              runningBalance: targetAccount.closingBalance.minus(refundAmountDec),
              referenceType: 'MANUAL_ADJUSTMENT', // Or SALES_RETURN enum if available
              transactionNo: cnNo,
              partyName: sale.partyName,
              paymentMode: dto.action === ReturnAction.REFUND_CASH ? 'CASH' : 'ONLINE',
              invoiceNo: cnNo
            }
          });
        }
      }

      return creditNote;
    });
  }

  // ==================================================================
  // 2. GET ALL RETURNS
  // ==================================================================
  async findAll(businessId: string, query: SalesReturnPaginationDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CreditNoteWhereInput = { businessId };

    if (search) {
      where.OR = [
        { noteNo: { contains: search, mode: 'insensitive' } },
        { sale: { partyName: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.creditNote.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          sale: { select: { invoiceNo: true, partyName: true } }
        }
      }),
      this.prisma.creditNote.count({ where })
    ]);

    return { 
      data, 
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) } 
    };
  }

  // ==================================================================
  // 3. GET ONE RETURN
  // ==================================================================
  async findOne(businessId: string, id: string) {
    const cn = await this.prisma.creditNote.findFirst({
      where: { id, businessId },
      include: {
        sale: {
          select: {
            id: true,
            invoiceNo: true,
            invoicePrefix: true,
            partyName: true,
            phoneNo: true
          }
        }
      }
    });

    if (!cn) throw new NotFoundException("Credit Note not found");
    return cn;
  }

  // ==================================================================
  // 4. CANCEL RETURN (Void)
  // ==================================================================
  async remove(businessId: string, id: string) {
    // Note: Reversing a return is extremely complex (re-deducting stock, re-adding money).
    // For MVP, we simply mark it as CANCELLED for audit purposes, but don't auto-reverse inventory.
    // A professional system would require a new "Sale" to reverse a "Return".
    
    const cn = await this.findOne(businessId, id);
    
    return this.prisma.creditNote.update({
        where: { id },
        data: { status: 'CANCELLED' }
    });
  }
}