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
      where: {
        businessId,
        partyName: { equals: dto.partyName, mode: 'insensitive' },
      },
    });
    if (existing) {
      throw new ConflictException(`Party "${dto.partyName}" already exists.`);
    }

    const partyType      = dto.partyType          ?? PartyType.CUSTOMER;
    const openingBalance = dto.openingBalance      ?? 0;
    const openingBalType = dto.openingBalanceType  ?? OpeningBalanceType.TO_COLLECT;

    const closingBalance =
      openingBalType === OpeningBalanceType.TO_PAY
        ? -Math.abs(openingBalance)
        :  Math.abs(openingBalance);

    const shippingAddress =
      dto.isBillingShippingSame && dto.billingAddress
        ? dto.billingAddress
        : dto.shippingAddress;

    return this.prisma.$transaction(async (tx) => {
      const party = await tx.party.create({
        data: {
          businessId,
          partyName:    dto.partyName,
          partyType,
          phoneNo:       dto.phoneNo       ?? null,
          email:         dto.email         ?? null,
          partyCategory: dto.partyCategory ?? null,
          isBusiness:    dto.isBusiness    ?? true,
          businessName:  dto.businessName  ?? null,
          notes:         dto.notes         ?? null,
          taxId:         dto.taxId         ?? null,
          panNo:         dto.panNo         ?? null,

          // Json? — must use Prisma.JsonNull, never plain null
          billingAddress: dto.billingAddress
            ? dto.billingAddress
            : Prisma.JsonNull,
          shippingAddress: shippingAddress
            ? shippingAddress
            : Prisma.JsonNull,
          isBillingShippingSame: dto.isBillingShippingSame ?? true,

          openingBalance:     new Prisma.Decimal(openingBalance),
          openingBalanceType: openingBalType,
          openingBalanceDate: new Date(),
          closingBalance:     new Prisma.Decimal(closingBalance),

          creditPeriod: dto.creditPeriod ?? null,
          creditLimit:  dto.creditLimit
            ? new Prisma.Decimal(dto.creditLimit)
            : null,

          customField: dto.customField ?? Prisma.JsonNull,
        },
      });

      if (openingBalance > 0) {
        await tx.partyLedger.create({
          data: {
            businessId,
            partyId:         party.id,
            partyType,
            partyName:       party.partyName,
            phoneNo:         party.phoneNo,
            email:           party.email,
            transactionDate: new Date(),
            description:     'Opening Balance',
            debit:
              openingBalType === OpeningBalanceType.TO_COLLECT
                ? new Prisma.Decimal(openingBalance)
                : new Prisma.Decimal(0),
            credit:
              openingBalType === OpeningBalanceType.TO_PAY
                ? new Prisma.Decimal(openingBalance)
                : new Prisma.Decimal(0),
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
    });
    if (!party) throw new NotFoundException('Party not found');
    return party;
  }

  // ================================================================
  // 4. UPDATE PARTY
  // ================================================================
  async update(businessId: string, id: string, dto: UpdatePartyDto) {
    await this.findOne(businessId, id);

    if (dto.partyName) {
      const dup = await this.prisma.party.findFirst({
        where: {
          businessId,
          partyName: { equals: dto.partyName, mode: 'insensitive' },
          NOT: { id },
        },
      });
      if (dup) {
        throw new ConflictException(
          `Party name "${dto.partyName}" is already in use.`,
        );
      }
    }

    const shippingAddress =
      dto.isBillingShippingSame && dto.billingAddress
        ? dto.billingAddress
        : dto.shippingAddress;

    return this.prisma.party.update({
      where: { id },
      data: {
        ...(dto.partyName     !== undefined && { partyName:     dto.partyName     }),
        ...(dto.phoneNo       !== undefined && { phoneNo:       dto.phoneNo       }),
        ...(dto.email         !== undefined && { email:         dto.email         }),
        ...(dto.partyType     !== undefined && { partyType:     dto.partyType     }),
        ...(dto.partyCategory !== undefined && { partyCategory: dto.partyCategory }),
        ...(dto.isBusiness    !== undefined && { isBusiness:    dto.isBusiness    }),
        ...(dto.businessName  !== undefined && { businessName:  dto.businessName  }),
        ...(dto.taxId         !== undefined && { taxId:         dto.taxId         }),
        ...(dto.panNo         !== undefined && { panNo:         dto.panNo         }),
        ...(dto.notes         !== undefined && { notes:         dto.notes         }),

        // Json? fields
        ...(dto.billingAddress !== undefined && {
          billingAddress: dto.billingAddress
            ? dto.billingAddress
            : Prisma.JsonNull,
        }),
        ...(shippingAddress !== undefined && {
          shippingAddress: shippingAddress
            ? shippingAddress
            : Prisma.JsonNull,
        }),
        ...(dto.isBillingShippingSame !== undefined && {
          isBillingShippingSame: dto.isBillingShippingSame,
        }),

        ...(dto.creditPeriod !== undefined && { creditPeriod: dto.creditPeriod }),
        ...(dto.creditLimit  !== undefined && {
          creditLimit: dto.creditLimit
            ? new Prisma.Decimal(dto.creditLimit)
            : null,
        }),

        ...(dto.customField !== undefined && {
          customField: dto.customField ?? Prisma.JsonNull,
        }),
      },
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
