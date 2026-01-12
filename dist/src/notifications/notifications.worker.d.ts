import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, Prisma } from '@prisma/client';
export declare class NotificationWorker {
    private prisma;
    constructor(prisma: PrismaService);
    handleCreateCustomerNotification(data: {
        customerUserId: string;
        title: string;
        message: string;
        type: NotificationType;
        metadata?: Prisma.JsonObject;
    }): Promise<void>;
    handleCreateSellerNotification(data: {
        userId: string;
        title: string;
        message: string;
        type: NotificationType;
        metadata?: Prisma.JsonObject;
    }): Promise<void>;
}
