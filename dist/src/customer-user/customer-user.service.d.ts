import { PrismaService } from '../prisma/prisma.service';
import { Address, CustomerUser, Prisma } from '@prisma/client';
import { UpdateAddressDto } from './dto/update-address.dto';
import { CreateAddressDto } from './dto/create-address.dto';
export declare class CustomerUserService {
    private prisma;
    constructor(prisma: PrismaService);
    findByEmail(email: string): Promise<CustomerUser | null>;
    create(data: Prisma.CustomerUserCreateInput): Promise<CustomerUser>;
    findById(id: string): Promise<CustomerUser | null>;
    findAddressesByUserId(userId: string): Promise<Address[]>;
    createAddress(userId: string, addressData: CreateAddressDto): Promise<Address>;
    updateAddress(userId: string, addressId: string, addressData: UpdateAddressDto): Promise<Address>;
    deleteAddress(userId: string, addressId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
