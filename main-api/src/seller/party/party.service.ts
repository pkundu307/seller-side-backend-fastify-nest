// src/seller/party/party.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma }        from '@prisma/client';
import { CreatePartyDto, OpeningBalanceType, PartyType } from './dto/create-party.dto';
import { UpdatePartyDto } from './dto/update-party.dto';
import { PartyQueryDto }  from './dto/party-query.dto';

@Injectable()
export class PartyService {
  constructor(private readonly prisma: PrismaService) {}

  // ================================================================
  // 1. CREATE PARTY
  // ================================================================
  async create(businessId: string, dto: CreatePartyDto) {
    const existing = await this.prisma.party.findFirst({
      where: { businessId, partyName: { equals: dto.partyName, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException(`Party "${dto.partyName}" already exists.`);

    const openingBalance = dto.openingBalance ?? 0;
    const openingBalType = dto.openingBalanceType ?? OpeningBalanceType.TO_COLLECT;
    const closingBalance = openingBalType === OpeningBalanceType.TO_PAY ? -Math.abs(openingBalance) : Math.abs(openingBalance);

    return this.prisma.$transaction(async (tx) => {
      const party = await tx.party.create({
        data: {
          businessId,
          partyName: dto.partyName,
          partyType: dto.partyType ?? PartyType.CUSTOMER,
          phoneNo: dto.phoneNo ?? null,
          email: dto.email ?? null,
          partyCategory: dto.partyCategory ?? null,
          isBusiness: dto.isBusiness ?? true,
          businessName: dto.businessName ?? null,
          notes: dto.notes ?? null,
          taxId: dto.taxId ?? null,
          panNo: dto.panNo ?? null,
          billingAddress: dto.billingAddress ? dto.billingAddress : Prisma.JsonNull,
          shippingAddress: (dto.isBillingShippingSame && dto.billingAddress) ? dto.billingAddress : (dto.shippingAddress || Prisma.JsonNull),
          isBillingShippingSame: dto.isBillingShippingSame ?? true,
          openingBalance: new Prisma.Decimal(openingBalance),
          openingBalanceType: openingBalType,
          openingBalanceDate: new Date(),
          closingBalance: new Prisma.Decimal(closingBalance),
          creditPeriod: dto.creditPeriod ?? null,
          creditLimit: dto.creditLimit ? new Prisma.Decimal(dto.creditLimit) : null,
          customField: dto.customField ?? Prisma.JsonNull,
          bankAccounts: dto.bankAccounts?.length ? { create: dto.bankAccounts } : undefined,
        },
      });

      if (openingBalance > 0) {
        await tx.partyLedger.create({
          data: {
            businessId,
            partyId: party.id,
            partyType: party.partyType,
            partyName: party.partyName,
            transactionDate: new Date(),
            description: 'Opening Balance',
            debit: openingBalType === OpeningBalanceType.TO_COLLECT ? new Prisma.Decimal(openingBalance) : new Prisma.Decimal(0),
            credit: openingBalType === OpeningBalanceType.TO_PAY ? new Prisma.Decimal(openingBalance) : new Prisma.Decimal(0),
          },
        });
      }
      return party;
    });
  }


  // ================================================================
  // 2. GET ALL PARTIES (Paginated + Filtered)
  // ================================================================
  async findAll(businessId: string, query: PartyQueryDto) {
    const { page = 1, limit = 20, search, partyType, partyCategory } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PartyWhereInput = {
      businessId,
      ...(partyType     ? { partyType }     : {}),
      ...(partyCategory ? { partyCategory } : {}),
      ...(search
        ? {
            OR: [
              { partyName: { contains: search, mode: 'insensitive' } },
              { phoneNo:   { contains: search, mode: 'insensitive' } },
              { email:     { contains: search, mode: 'insensitive' } },
              { taxId:     { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [parties, total] = await this.prisma.$transaction([
      this.prisma.party.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { partyName: 'asc' },
      }),
      this.prisma.party.count({ where }),
    ]);

    // Separate aggregates — no deletedAt, no bankAccounts
    const [toCollectAgg, toPayAgg] = await Promise.all([
      this.prisma.party.aggregate({
        where: { businessId, partyType: 'CUSTOMER', closingBalance: { gt: 0 } },
        _sum:  { closingBalance: true },
      }),
      this.prisma.party.aggregate({
        where: { businessId, partyType: 'SUPPLIER', closingBalance: { lt: 0 } },
        _sum:  { closingBalance: true },
      }),
    ]);

    return {
      summary: {
        toCollect: Number(toCollectAgg._sum?.closingBalance  ?? 0),
        toPay:     Math.abs(Number(toPayAgg._sum?.closingBalance ?? 0)),
        total,
      },
      data:       parties,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ================================================================
  // 3. GET ONE PARTY
  // ================================================================
async findOne(businessId: string, id: string) {
  const party = await this.prisma.party.findFirst({
    where: { id, businessId },
    include: { bankAccounts: true }
  });
  if (!party) throw new NotFoundException('Party not found');
  return party;
}
async getPartyDetails(businessId: string, partyId: string) {
  const party = await this.prisma.party.findFirst({
    where: { id: partyId, businessId },
    include: { bankAccounts: true },
  });
  if (!party) throw new NotFoundException('Party not found');

  // ── Transactions: Sales ──────────────────────────────────────
  const sales = await this.prisma.sale.findMany({
    where: { businessId, partyId, deletedAt: null },
    select: {
      id: true,
      invoicePrefix: true,
      invoiceNo: true,
      invoiceDate: true,
      totalAmount: true,
      balanceAmount: true,
      isSettled: true,
      status: true,
      partyName: true,
    },
    orderBy: { invoiceDate: 'desc' },
  });

  // ── Transactions: Purchases ──────────────────────────────────
  const purchases = await this.prisma.purchase.findMany({
    where: { businessId, supplierPartyId: partyId },
    select: {
      id: true,
      purchaseOrderNo: true,
      purchaseOrderDate: true,
      totalAmount: true,
      balanceDue: true,
      status: true,
      supplierName: true,
    },
    orderBy: { purchaseOrderDate: 'desc' },
  });

  // ── Ledger Entries ────────────────────────────────────────────
  const ledger = await this.prisma.partyLedger.findMany({
    where: { businessId, partyId },
    orderBy: { transactionDate: 'asc' },
  });

  // ── Item-Wise Report: group sale items by variant ─────────────
  const saleItems = await this.prisma.saleItem.findMany({
    where: {
      sale: { businessId, partyId, deletedAt: null },
    },
    select: {
      itemId: true,
      itemName: true,
      hsnCode: true,
      quantity: true,
      price: true,
      amount: true,
      taxAmount: true,
      unit: true,
      sale: { select: { invoiceDate: true, invoiceNo: true, invoicePrefix: true } },
    },
  });

  // Group by itemId
  const itemMap = new Map<
    string,
    {
      itemId: string;
      itemName: string;
      hsnCode: string;
      unit: string;
      totalQty: number;
      totalAmount: number;
      totalTax: number;
      transactions: { invoiceNo: string; date: string; qty: number; amount: number }[];
    }
  >();

  for (const si of saleItems) {
    const existing = itemMap.get(si.itemId);
    const entry = {
      invoiceNo: `${si.sale.invoicePrefix}-${si.sale.invoiceNo}`,
      date: si.sale.invoiceDate.toISOString(),
      qty: Number(si.quantity),
      amount: Number(si.amount),
    };
    if (existing) {
      existing.totalQty += Number(si.quantity);
      existing.totalAmount += Number(si.amount);
      existing.totalTax += Number(si.taxAmount);
      existing.transactions.push(entry);
    } else {
      itemMap.set(si.itemId, {
        itemId: si.itemId,
        itemName: si.itemName,
        hsnCode: si.hsnCode ?? '',
        unit: si.unit,
        totalQty: Number(si.quantity),
        totalAmount: Number(si.amount),
        totalTax: Number(si.taxAmount),
        transactions: [entry],
      });
    }
  }

  // Running balance for ledger
  let running = 0;
  const ledgerWithBalance = ledger.map((l) => {
    running += Number(l.debit) - Number(l.credit);
    return { ...l, runningBalance: running };
  });

  return {
    party,
    transactions: {
      sales: sales.map((s) => ({
        id: s.id,
        type: 'SALE',
        invoiceNo: `${s.invoicePrefix}-${s.invoiceNo}`,
        date: s.invoiceDate,
        total: Number(s.totalAmount),
        balance: Number(s.balanceAmount),
        isSettled: s.isSettled,
        status: s.status,
        partyName: s.partyName,
      })),
      purchases: purchases.map((p) => ({
        id: p.id,
        type: 'PURCHASE',
        invoiceNo: p.purchaseOrderNo,
        date: p.purchaseOrderDate,
        total: Number(p.totalAmount),
        balance: Number(p.balanceDue),
        // isSettled: p.balanceDue === 0,
        status: p.status,
        partyName: p.supplierName,
      })),
    },
    ledger: ledgerWithBalance,
    itemWise: Array.from(itemMap.values()),
  };
}


  // ================================================================
  // 4. UPDATE PARTY
  // ================================================================
 async update(businessId: string, id: string, dto: UpdatePartyDto) {
    await this.findOne(businessId, id);

    if (dto.partyName) {
      const dup = await this.prisma.party.findFirst({
        where: { businessId, partyName: { equals: dto.partyName, mode: 'insensitive' }, NOT: { id } },
      });
      if (dup) throw new ConflictException(`Party name "${dto.partyName}" is already in use.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedParty = await tx.party.update({
        where: { id },
        data: {
          partyName: dto.partyName,
          phoneNo: dto.phoneNo,
          email: dto.email,
          partyType: dto.partyType,
          partyCategory: dto.partyCategory,
          isBusiness: dto.isBusiness,
          businessName: dto.businessName,
          taxId: dto.taxId,
          panNo: dto.panNo,
          notes: dto.notes,
          billingAddress: dto.billingAddress ?? Prisma.JsonNull,
          shippingAddress: dto.shippingAddress ?? Prisma.JsonNull,
          creditPeriod: dto.creditPeriod,
          creditLimit: dto.creditLimit ? new Prisma.Decimal(dto.creditLimit) : null,
          customField: dto.customField ?? Prisma.JsonNull,
        },
      });

      if (dto.bankAccounts) {
        await tx.partyBankAccount.deleteMany({ where: { partyId: id } });
        await tx.partyBankAccount.createMany({
          data: dto.bankAccounts.map(ba => ({ ...ba, partyId: id })),
        });
      }
      return updatedParty;
    });
  }

 

  // ================================================================
  // 5. DELETE PARTY (Hard delete — no deletedAt on Party model)
  // ================================================================
  async remove(businessId: string, id: string) {
    const party = await this.findOne(businessId, id);

    if (Number(party.closingBalance ?? 0) !== 0) {
      throw new ConflictException(
        `Cannot delete "${party.partyName}" — outstanding balance of ₹${Math.abs(
          Number(party.closingBalance),
        )} exists. Settle all dues first.`,
      );
    }

    await this.prisma.party.delete({ where: { id } });

    return { success: true, message: `Party "${party.partyName}" deleted.` };
  }
}
