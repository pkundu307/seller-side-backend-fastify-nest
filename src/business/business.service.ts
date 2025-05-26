import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto } from './dto/business.dto';

@Injectable()
export class BusinessService {
  constructor(private prisma: PrismaService) {}

  async createBusiness(dto: CreateBusinessDto, ownerId: number) {
    return this.prisma.business.create({
      data: {
        ...dto,
        ownerId,
        isVerified: false, 
      },
    });
  }

  async getMyBusinesses(ownerId: number) {
    return this.prisma.business.findMany({
      where: { ownerId },
    });
  }
}
