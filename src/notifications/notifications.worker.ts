import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, Prisma } from '@prisma/client';

// This controller listens to the queue, not HTTP routes
@Controller()
export class NotificationWorker {
  constructor(private prisma: PrismaService) {}

  // This method is triggered when a message with the pattern 'notification_create_customer' arrives
  @MessagePattern('notification_create_customer')
  async handleCreateCustomerNotification(
    @Payload() data: {
      customerUserId: string;
      title: string;
      message: string;
      type: NotificationType;
      metadata?: Prisma.JsonObject;
    },
  ) {
    console.log('Received new customer notification job:', data.title);
    await this.prisma.customerNotification.create({
      data: {
        customerUserId: data.customerUserId,
        title: data.title,
        message: data.message,
        type: data.type,
        metadata: data.metadata,
      },
    });
  }

  // This method is triggered for seller notifications
  @MessagePattern('notification_create_seller')
  async handleCreateSellerNotification(
    @Payload() data: {
      userId: string;
      title: string;
      message: string;
      type: NotificationType;
      metadata?: Prisma.JsonObject;
    },
  ) {
    console.log('Received new seller notification job:', data.title);
    await this.prisma.sellerNotification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        metadata: data.metadata,
      },
    });
  }
}