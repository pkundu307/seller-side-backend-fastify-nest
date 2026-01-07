import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
      where: { customerUserId: userId },
      orderBy: { isDefault: 'desc' }, // Show default address first
    });
  }

  async createAddress(userId: string, addressData: CreateAddressDto): Promise<Address> {
    return this.prisma.$transaction(async (tx) => {
      // 1. If the new address is being set as default...
      if (addressData.isDefault === true) {
        // ...then set all OTHER addresses for this user to isDefault: false.
        await tx.address.updateMany({
          where: {
            customerUserId: userId,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      // 2. Now, create the new address with the correct default status.
      const newAddress = await tx.address.create({
        data: {
          ...addressData,
          customerUserId: userId,
        },
      });

      return newAddress;
    });
  }

  async updateAddress(
    userId: string,
    addressId: string,
    addressData: UpdateAddressDto,
  ): Promise<Address> {
    // First, verify the address exists and belongs to the user.
    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw new NotFoundException(`Address with ID "${addressId}" not found.`);
    }
    if (address.customerUserId !== userId) {
      throw new ForbiddenException(`You do not have permission to update this address.`);
    }

    // Now perform the update within a transaction
    return this.prisma.$transaction(async (tx) => {
      // 1. If the user is trying to set this address as the new default...
      if (addressData.isDefault === true) {
        // ...then unset any other address that is currently the default for this user.
        await tx.address.updateMany({
          where: {
            customerUserId: userId,
            isDefault: true,
            // Exclude the current address from this update in case it's already the default
            NOT: { id: addressId }, 
          },
          data: {
            isDefault: false,
          },
        });
      }

      // 2. Now, update the target address with the new data.
      const updatedAddress = await tx.address.update({
        where: { id: addressId },
        data: addressData,
      });

      return updatedAddress;
    });
  }

  async deleteAddress(userId: string, addressId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Delete where ID matches AND the owner is the current user
      await this.prisma.address.delete({
        where: {
          id: addressId,
          customerUserId: userId, // <-- Security check!
        },
      });
      return { success: true, message: 'Address deleted successfully.' };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(
          `Address with ID "${addressId}" not found or you don't have permission to delete it.`,
        );
      }
      throw error;
    }
  }
  

  
}