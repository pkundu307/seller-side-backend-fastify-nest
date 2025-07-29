import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerUser, Prisma } from '@prisma/client';

@Injectable()
export class CustomerUserService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<CustomerUser | null> {
    return this.prisma.customerUser.findUnique({
      where: { email },
    });
  }

  async create(data: Prisma.CustomerUserCreateInput): Promise<CustomerUser> {
    return this.prisma.customerUser.create({
      data,
    });
  }

  // You can add more methods here later (e.g., findById, update)
}