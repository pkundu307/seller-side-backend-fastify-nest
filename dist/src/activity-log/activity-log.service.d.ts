import { PrismaService } from '../prisma/prisma.service';
import { ActivityLog, Prisma } from '@prisma/client';
export declare enum ActivityType {
    USER_REGISTERED = "USER_REGISTERED",
    BUSINESS_CREATED = "BUSINESS_CREATED",
    PRODUCT_CREATED = "PRODUCT_CREATED",
    PRODUCT_UPDATED = "PRODUCT_UPDATED",
    PRODUCT_DELETED = "PRODUCT_DELETED",
    CATEGORY_CREATED = "CATEGORY_CREATED",
    CATEGORY_UPDATED = "CATEGORY_UPDATED"
}
export declare enum EntityType {
    USER = "User",
    BUSINESS = "Business",
    PRODUCT = "Product",
    CATEGORY = "Category"
}
export declare class ActivityLogService {
    private prisma;
    constructor(prisma: PrismaService);
    logActivity(actionType: ActivityType, entityType: EntityType, description: string, performedByUserId?: string, businessId?: string, entityId?: string, details?: Prisma.InputJsonValue): Promise<ActivityLog>;
}
