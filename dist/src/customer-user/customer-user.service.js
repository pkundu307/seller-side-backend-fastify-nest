"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerUserService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let CustomerUserService = class CustomerUserService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findByEmail(email) {
        return this.prisma.customerUser.findUnique({
            where: { email },
        });
    }
    async create(data) {
        return this.prisma.customerUser.create({
            data,
        });
    }
    async findById(id) {
        return this.prisma.customerUser.findUnique({
            where: { id },
        });
    }
    async findAddressesByUserId(userId) {
        return this.prisma.address.findMany({
            where: { customerUserId: userId },
            orderBy: { isDefault: 'desc' },
        });
    }
    async createAddress(userId, addressData) {
        return this.prisma.$transaction(async (tx) => {
            if (addressData.isDefault === true) {
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
            const newAddress = await tx.address.create({
                data: {
                    ...addressData,
                    customerUserId: userId,
                },
            });
            return newAddress;
        });
    }
    async updateAddress(userId, addressId, addressData) {
        const address = await this.prisma.address.findUnique({
            where: { id: addressId },
        });
        if (!address) {
            throw new common_1.NotFoundException(`Address with ID "${addressId}" not found.`);
        }
        if (address.customerUserId !== userId) {
            throw new common_1.ForbiddenException(`You do not have permission to update this address.`);
        }
        return this.prisma.$transaction(async (tx) => {
            if (addressData.isDefault === true) {
                await tx.address.updateMany({
                    where: {
                        customerUserId: userId,
                        isDefault: true,
                        NOT: { id: addressId },
                    },
                    data: {
                        isDefault: false,
                    },
                });
            }
            const updatedAddress = await tx.address.update({
                where: { id: addressId },
                data: addressData,
            });
            return updatedAddress;
        });
    }
    async deleteAddress(userId, addressId) {
        try {
            await this.prisma.address.delete({
                where: {
                    id: addressId,
                    customerUserId: userId,
                },
            });
            return { success: true, message: 'Address deleted successfully.' };
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new common_1.NotFoundException(`Address with ID "${addressId}" not found or you don't have permission to delete it.`);
            }
            throw error;
        }
    }
};
exports.CustomerUserService = CustomerUserService;
exports.CustomerUserService = CustomerUserService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CustomerUserService);
//# sourceMappingURL=customer-user.service.js.map