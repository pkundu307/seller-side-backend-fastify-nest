import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerUser, NotificationType, Prisma, User } from '@prisma/client';
import { ClientProxy } from '@nestjs/microservices';
import { RABBITMQ_SERVICE } from 'src/rabbitmq/rabbitmq.module';


interface NotificationPayload {
  recipientId: string;
  recipientEmail: string; // <-- ADD THIS
  recipientType: 'customer' | 'seller';
  notificationId: string;
  title: string;
  message: string;
  type: NotificationType;
  metadata?: Prisma.JsonValue;
}
@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService,
        @Inject(RABBITMQ_SERVICE) private readonly rabbitClient: ClientProxy,

  ) {}
  async onModuleDestroy() {
    await this.rabbitClient.close();
  }
  /**
   * Creates a notification for a CustomerUser.
   * @param customerUserId - The ID of the customer to notify.
   * @param title - The title of the notification.
   * @param message - The main content of the notification.
   * @param type - The category of the notification (e.g., ORDER, PROMOTION).
   * @param metadata - Optional JSON object for extra data (e.g., { orderId: '...' }).
   */
 async createForCustomer(
    user: Pick<CustomerUser, 'id' | 'email'>,
    title: string,
    message: string,
    type: NotificationType = NotificationType.SYSTEM,
    metadata?: Prisma.JsonObject, // The input can still be an object for clarity
  ) {
    // 1. Create the notification record in the database.
    const notification = await this.prisma.customerNotification.create({
      data: { customerUserId: user.id, title, message, type, metadata },
    });

    // 2. Prepare the payload with the email included.
    // This now works because notification.metadata (JsonValue) is assignable to payload.metadata (JsonValue).
    const payload: NotificationPayload = {
      recipientId: user.id,
      recipientEmail: user.email,
      recipientType: 'customer',
      notificationId: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      metadata: notification.metadata, // This assignment is now valid
    };

    // 3. Publish the event to RabbitMQ.
    this.rabbitClient.emit('notification_created', payload);
    
    return notification;
  }

  /**
   * Creates a notification for a seller/admin User and publishes it to RabbitMQ.
   * @param user - The seller user object, must contain id and email.
   */
  async createForSeller(
    user: Pick<User, 'id' | 'email'>,
    title: string,
    message: string,
    type: NotificationType = NotificationType.SYSTEM,
    metadata?: Prisma.JsonObject,
  ) {
    // 1. Create the database record.
    const notification = await this.prisma.sellerNotification.create({
      data: { userId: user.id, title, message, type, metadata },
    });

    // 2. Prepare the payload.
    // This now works for the same reason as above.
    const payload: NotificationPayload = {
      recipientId: user.id,
      recipientEmail: user.email,
      recipientType: 'seller',
      notificationId: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      metadata: notification.metadata, // This assignment is now valid
    };

    // 3. Publish the event.
    this.rabbitClient.emit('notification_created', payload);

    return notification;
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