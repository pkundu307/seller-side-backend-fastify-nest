import { NotificationService } from './notifications.service';
import { UserRequest } from '../auth/auth.types';
export declare class NotificationsController {
    private readonly notificationService;
    constructor(notificationService: NotificationService);
    getCustomerNotifications(req: UserRequest, page: number, limit: number): Promise<{
        notifications: {
            id: string;
            createdAt: Date;
            type: import(".prisma/client").$Enums.NotificationType;
            title: string;
            updatedAt: Date;
            customerUserId: string;
            message: string;
            isRead: boolean;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            lastPage: number;
        };
    }>;
    getSellerNotifications(req: UserRequest, page: number, limit: number): Promise<{
        notifications: {
            id: string;
            createdAt: Date;
            type: import(".prisma/client").$Enums.NotificationType;
            title: string;
            updatedAt: Date;
            message: string;
            isRead: boolean;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
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
