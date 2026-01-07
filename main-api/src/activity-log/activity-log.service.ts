// src/activity-log/activity-log.service.ts (already defined)

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLog, Prisma } from '@prisma/client';

// Define enums for consistent types
export enum ActivityType {
  USER_REGISTERED = 'USER_REGISTERED',
  BUSINESS_CREATED = 'BUSINESS_CREATED',
  PRODUCT_CREATED = 'PRODUCT_CREATED',
  PRODUCT_UPDATED = 'PRODUCT_UPDATED',
  PRODUCT_DELETED = 'PRODUCT_DELETED',
  CATEGORY_CREATED = 'CATEGORY_CREATED',
  CATEGORY_UPDATED = 'CATEGORY_UPDATED',
  // Add more as needed
}

export enum EntityType {
  USER = 'User',
  BUSINESS = 'Business',
  PRODUCT = 'Product',
  CATEGORY = 'Category',
  // Add more as needed
}

@Injectable()
export class ActivityLogService {
  constructor(private prisma: PrismaService) {}

  /**
   * Logs an activity to the database.
   * @param actionType - The type of action performed (e.g., 'USER_REGISTERED').
   * @param entityType - The type of entity affected (e.g., 'User', 'Product').
   * @param description - A human-readable description of the activity.
   * @param performedByUserId - (Optional) The ID of the user who performed the action.
   * @param businessId - (Optional) The ID of the business related to the activity.
   * @param entityId - (Optional) The ID of the primary entity affected by the action.
   * @param details - (Optional) Additional structured JSON data for more context.
   */
  async logActivity(
    actionType: ActivityType,
    entityType: EntityType,
    description: string,
    performedByUserId?: string,
    businessId?: string,
    entityId?: string,
    details?: Prisma.InputJsonValue,
  ): Promise<ActivityLog> {
    return this.prisma.activityLog.create({
      data: {
        actionType,
        entityType,
        entityId,
        description,
        performedByUserId,
        businessId,
        details,
      },
    });
  }
}