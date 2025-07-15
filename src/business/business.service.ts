import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { randomInt } from 'crypto';

@Injectable()
export class BusinessService {
  constructor(private readonly prisma: PrismaService) {}

  async createBusiness(dto: CreateBusinessDto, ownerId: string) {
    const businessId = randomInt(1000000, 9999999).toString();

    return this.prisma.business.create({
      data: {
        ...dto,
        ownerId,
        id: businessId,
      },
    });
  }

  async getAllBusinesses(ownerId: string) {
    return this.prisma.business.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
  }
}