import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, Prisma } from '@prisma/client';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Creates a notification for a CustomerUser.
   * @param customerUserId - The ID of the customer to notify.
   * @param title - The title of the notification.
   * @param message - The main content of the notification.
   * @param type - The category of the notification (e.g., ORDER, PROMOTION).
   * @param metadata - Optional JSON object for extra data (e.g., { orderId: '...' }).
   */
  async createForCustomer(
    customerUserId: string,
    title: string,
    message: string,
    type: NotificationType = NotificationType.SYSTEM,
    metadata?: Prisma.JsonObject,
  ) {
    return this.prisma.customerNotification.create({
      data: {
        customerUserId,
        title,
        message,
        type,
        metadata,
      },
    });
  }

  /**
   * Creates a notification for a seller/admin User.
   * @param userId - The ID of the user to notify.
   * @param title - The title of the notification.
   * @param message - The main content of the notification.
   * @param type - The category of the notification (e.g., ORDER, ALERT).
   * @param metadata - Optional JSON object for extra data (e.g., { orderId: '...', businessId: '...' }).
   */
  async createForSeller(
    userId: string,
    title: string,
    message: string,
    type: NotificationType = NotificationType.SYSTEM,
    metadata?: Prisma.JsonObject,
  ) {
    return this.prisma.sellerNotification.create({
      data: {
        userId,
        title,
        message,
        type,
        metadata,
      },
    });
  }

  /**
   * Fetches all notifications for a specific CustomerUser, paginated.
   */
  async findForCustomer(customerUserId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [notifications, total] = await this.prisma.$transaction([
      this.prisma.customerNotification.findMany({
        where: { customerUserId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.customerNotification.count({ where: { customerUserId } }),
    ]);
    
    return {
      notifications,
      pagination: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Fetches all notifications for a specific seller/admin User, paginated.
   */
  async findForSeller(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [notifications, total] = await this.prisma.$transaction([
      this.prisma.sellerNotification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.sellerNotification.count({ where: { userId } }),
    ]);

    return {
      notifications,
      pagination: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
  }
}