import { CustomerUserService } from './customer-user.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { UserRequest } from '../auth/auth.types';
export declare class CustomerUserController {
    private readonly customerUserService;
    constructor(customerUserService: CustomerUserService);
    getMyAddresses(req: UserRequest): Promise<{
        id: string;
        createdAt: Date;
        type: string;
        updatedAt: Date;
        street: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
        landmark: string | null;
        alternativePhoneNumber: string | null;
        isDefault: boolean;
        latitude: number | null;
        longitude: number | null;
        notes: string | null;
        customerUserId: string;
    }[]>;
    addAddress(req: UserRequest, createAddressDto: CreateAddressDto): Promise<{
        id: string;
        createdAt: Date;
        type: string;
        updatedAt: Date;
        street: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
        landmark: string | null;
        alternativePhoneNumber: string | null;
        isDefault: boolean;
        latitude: number | null;
        longitude: number | null;
        notes: string | null;
        customerUserId: string;
    }>;
    updateAddress(req: UserRequest, addressId: string, updateAddressDto: UpdateAddressDto): Promise<{
        id: string;
        createdAt: Date;
        type: string;
        updatedAt: Date;
        street: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
        landmark: string | null;
        alternativePhoneNumber: string | null;
        isDefault: boolean;
        latitude: number | null;
        longitude: number | null;
        notes: string | null;
        customerUserId: string;
    }>;
    deleteAddress(req: UserRequest, addressId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
