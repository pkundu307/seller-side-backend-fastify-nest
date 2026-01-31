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
  // 1. CREATE SALES RETURN & CREDIT NOTE
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

    // 2. Calculation Phase
    let totalRefundAmountDec = new Prisma.Decimal(0);
    // In a full GST system, you would calculate SGST/CGST reversal here based on original tax rates
    let totalTaxReversalDec = new Prisma.Decimal(0); 

    for (const returnItem of dto.items) {
      const originalItem = sale.saleItems.find(i => i.itemId === returnItem.variantId);
      
      if (!originalItem) {
        throw new BadRequestException(`Item ${returnItem.variantId} was not in the original invoice.`);
      }
      
      if (Number(originalItem.quantity) < returnItem.quantity) {
        throw new BadRequestException(`Cannot return more than purchased.`);
      }

      // Financial Value = Quantity * Price Sold At
      const itemTotal = originalItem.price.times(returnItem.quantity);
      totalRefundAmountDec = totalRefundAmountDec.plus(itemTotal);
    }

    return this.prisma.$transaction(async (tx) => {
      // --- STEP A: ISSUE CREDIT NOTE (The Financial Document) ---
      // This is the legal document proving we owe the customer money.
      const cnNo = `CN-${Date.now().toString().slice(-6)}`; // Replace with sequential logic in production

      const creditNote = await tx.creditNote.create({
        data: {
          businessId,
          saleId: dto.saleId,
          noteNo: cnNo,
          date: new Date(),
          reason: dto.reason || 'Sales Return',
          amount: totalRefundAmountDec,
          taxAmount: totalTaxReversalDec,
          status: 'ACTIVE'
        }
      });

      // --- STEP B: SALES RETURN (The Physical Goods / Logistics) ---
      for (const item of dto.items) {
        const originalItem = sale.saleItems.find(i => i.itemId === item.variantId);
        
        if (!originalItem) throw new BadRequestException("Item not found"); // Should be caught above

        // 1. Inventory Action (Conditional)
        if (item.isRestock !== false) {
          // "Sales Return": The goods physically returned to the shelf.
          await tx.variant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } }
          });
        } 
        // Else: "Scrap": The goods returned but were thrown away. 
        // We still issue a Credit Note (money back), but Stock does NOT increase.

        // 2. Update Original Invoice Logic (Concatenate Notes)
        const dateStr = new Date().toLocaleDateString('en-GB'); 
        const statusStr = item.isRestock !== false ? 'Restocked' : 'Scrapped';
        const returnMsg = `[${dateStr}] Returned: ${item.quantity} (${statusStr}) - CN: ${cnNo}`;
        
        // Handle Schema mapping
        const currentDesc = originalItem.itemDescription || '';
        const newDesc = currentDesc ? `${currentDesc} | ${returnMsg}` : returnMsg;

        // We strictly reduce the quantity on the Invoice line item to reflect "Net Sold"
        await tx.saleItem.update({
          where: { id: originalItem.id },
          data: { 
            quantity: { decrement: item.quantity },
            itemDescription: newDesc,
            // Adjust line amount so Invoice Totals match Net Sold
            amount: originalItem.price.times(Number(originalItem.quantity) - item.quantity)
          }
        });
      }

      // --- STEP C: SETTLEMENT (Paying the Credit Note) ---
      
      if (dto.action === ReturnAction.ADJUST_LEDGER) {
        // Option 1: Store Credit (Party Ledger)
        if (!sale.partyId) throw new BadRequestException("Cannot adjust ledger for anonymous customer.");

        await tx.partyLedger.create({
          data: {
            businessId,
            partyType: 'CUSTOMER',
            referenceId: sale.partyId,
            partyName: sale.partyName,
            transactionDate: new Date(),
            description: `Credit Note #${cnNo} (Adjustment)`,
            credit: totalRefundAmountDec, // Credit reduces their Debit (Owed) balance
            debit: 0,
            linkedSaleId: sale.id
          }
        });

      } else {
        // Option 2: Immediate Refund (Cash/Bank)
        let targetAccount: BankCashCheque | null = null;

        if (dto.refundAccountId) {
           targetAccount = await tx.bankCashCheque.findFirst({ where: { id: dto.refundAccountId } });
        } else {
           const type = dto.action === ReturnAction.REFUND_CASH ? 'CASH' : { in: ['BANK', 'UPI'] };
           targetAccount = await tx.bankCashCheque.findFirst({
             where: { businessId, accountType: type as any, isEnabled: true },
             orderBy: { isDefault: 'desc' }
           });
        }

        if (targetAccount) {
          // Money leaves the Shop Account
          await tx.bankCashCheque.update({
            where: { id: targetAccount.id },
            data: { closingBalance: { decrement: totalRefundAmountDec } }
          });

          await tx.bankCashChequeTransaction.create({
            data: {
              businessId,
              accountId: targetAccount.id,
              transactionType: 'DEBIT', 
              amount: totalRefundAmountDec,
              runningBalance: targetAccount.closingBalance.minus(totalRefundAmountDec),
              referenceType: 'MANUAL_ADJUSTMENT',
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
  // ==================================================================
    // 5. GET INVOICES BY CUSTOMER (For creating return)
  // ==================================================================
  async getInvoicesByCustomer(businessId: string, customerId: string) {
    // Fetch only finalized sales that are not cancelled
    const sales = await this.prisma.sale.findMany({
      where: {
        businessId,
        partyId: customerId, // Match the customer
        status: 'FINALIZED',
        deletedAt: null
      },
      orderBy: { invoiceDate: 'desc' }, // Newest first
      select: {
        id: true,
        invoiceNo: true,
        invoicePrefix: true,
        invoiceDate: true,
        totalAmount: true,
        
        // Include items to show what can be returned
        saleItems: {
          select: {
            itemId: true, // Variant ID
            itemName: true,
            quantity: true, // Original Qty Sold
            price: true,
            amount: true
          }
        },
        
        // Include Credit Notes to check if items were ALREADY returned
        creditNotes: {
          where: { status: 'ACTIVE' },
          select: {
            amount: true,
            createdAt: true
          }
        }
      }
    });

    // Format for Frontend
    return sales.map(sale => {
      // Calculate total previously returned amount (approximate check)
      // A more complex system would track per-item returns, but this is a good summary.
      const totalReturnedValue = sale.creditNotes.reduce((sum, cn) => sum + Number(cn.amount), 0);

      return {
        saleId: sale.id,
        invoiceNumber: `${sale.invoicePrefix}-${sale.invoiceNo}`,
        date: sale.invoiceDate,
        totalAmount: Number(sale.totalAmount),
        returnedAmountSoFar: totalReturnedValue,
        canReturn: totalReturnedValue < Number(sale.totalAmount), // Flag if fully refunded
        items: sale.saleItems.map(item => ({
          variantId: item.itemId,
          name: item.itemName,
          soldQuantity: Number(item.quantity),
          price: Number(item.price)
        }))
      };
    });
  }
}