import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Address, CustomerUser, Prisma } from '@prisma/client';
import { UpdateAddressDto } from './dto/update-address.dto';
import { CreateAddressDto } from './dto/create-address.dto';

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
  async findById(id: string): Promise<CustomerUser | null> {
    return this.prisma.customerUser.findUnique({
      where: { id },
    });
  }
   async findAddressesByUserId(userId: string): Promise<Address[]> {
    return this.prisma.address.findMany({
      where: {
        customerUserId: userId,
      },
    });
  }

  async createAddress(
    userId: string,
    addressData: CreateAddressDto,
  ): Promise<Address> {
    // This will now work because the userId comes from a valid, authenticated JWT token.
    return this.prisma.address.create({
      data: {
        ...addressData,
        customerUserId: userId,
      },
    });
  }

  async updateAddress(
    userId: string,
    addressId: string,
    addressData: UpdateAddressDto,
  ): Promise<Address> {
    try {
      // This is a secure way to update. It ensures the addressId and userId both match a single record.
      return await this.prisma.address.update({
        where: {
          id: addressId,
          customerUserId: userId, // <-- Security check!
        },
        data: addressData,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(
          `Address with ID "${addressId}" not found or you don't have permission to update it.`,
        );
      }
      throw error;
    }
  }
}