import { PrismaService } from '../prisma/prisma.service';
import { CustomerUser, NotificationType, Prisma, User } from '@prisma/client';
export declare class NotificationService {
    private prisma;
    constructor(prisma: PrismaService);
    onModuleDestroy(): Promise<void>;
    createForCustomer(user: Pick<CustomerUser, 'id' | 'email'>, title: string, message: string, type?: NotificationType, metadata?: Prisma.JsonObject): Promise<{
        id: string;
        createdAt: Date;
        type: import(".prisma/client").$Enums.NotificationType;
        title: string;
        updatedAt: Date;
        customerUserId: string;
        message: string;
        isRead: boolean;
        metadata: Prisma.JsonValue | null;
    }>;
    createForSeller(user: Pick<User, 'id' | 'email'>, title: string, message: string, type?: NotificationType, metadata?: Prisma.JsonObject): Promise<{
        id: string;
        createdAt: Date;
        type: import(".prisma/client").$Enums.NotificationType;
        title: string;
        updatedAt: Date;
        message: string;
        isRead: boolean;
        metadata: Prisma.JsonValue | null;
        userId: string;
    }>;
    findForCustomer(customerUserId: string, page?: number, limit?: number): Promise<{
        notifications: {
            id: string;
            createdAt: Date;
            type: import(".prisma/client").$Enums.NotificationType;
            title: string;
            updatedAt: Date;
            customerUserId: string;
            message: string;
            isRead: boolean;
            metadata: Prisma.JsonValue | null;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            lastPage: number;
        };
    }>;
    findForSeller(userId: string, page?: number, limit?: number): Promise<{
        notifications: {
            id: string;
            createdAt: Date;
            type: import(".prisma/client").$Enums.NotificationType;
            title: string;
            updatedAt: Date;
            message: string;
            isRead: boolean;
            metadata: Prisma.JsonValue | null;
            userId: string;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            lastPage: number;
        };
    }>;
}
