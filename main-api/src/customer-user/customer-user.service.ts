import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Address, CustomerUser, Prisma, TicketStatus } from '@prisma/client';
import { UpdateAddressDto } from './dto/update-address.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { AddToWaitlistDto } from './dto/add-to-waitlist.dto';
import { S3Service } from 'src/products/utils/s3Service';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';
import * as sharp from 'sharp';
import { CreateTicketDto, ReplyTicketDto } from './dto/ticket.dto';
import { STATE_CODE_MAP } from 'src/utils/state-codes';

@Injectable()
export class CustomerUserService {
  constructor(private prisma: PrismaService,
        private s3Service: S3Service

  ) {}

  async findByEmail(email: string): Promise<CustomerUser | null> {
    return this.prisma.customerUser.findUnique({
      where: { email },
    });
  }

  async create(data: Prisma.CustomerUserCreateInput): Promise<CustomerUser> {
    return this.prisma.customerUser.create({
      data,
    });
  }



  // You can add more methods here later (e.g., findById, update)
  async findById(id: string): Promise<CustomerUser | null> {
    return this.prisma.customerUser.findUnique({
      where: { id },
    });
  }
  async findAddressesByUserId(userId: string): Promise<Address[]> {
    return this.prisma.address.findMany({
      where: { customerUserId: userId },
      orderBy: { isDefault: 'desc' }, // Show default address first
    });
  }

async createAddress(userId: string, addressData: CreateAddressDto): Promise<Address> {
  const resolvedStateCode = STATE_CODE_MAP[addressData.state] || undefined;

  return this.prisma.$transaction(async (tx) => {
    // If this is the user's first address, force it to be default
    const count = await tx.address.count({ where: { customerUserId: userId } });
    const shouldBeDefault = count === 0 ? true : !!addressData.isDefault;

    if (shouldBeDefault) {
      await tx.address.updateMany({
        where: { customerUserId: userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return await tx.address.create({
      data: {
        ...addressData,
        stateCode: resolvedStateCode,
        isDefault: shouldBeDefault,
        customerUserId: userId,
      },
    });
  });
}

async updateAddress(userId: string, addressId: string, addressData: UpdateAddressDto): Promise<Address> {
  const address = await this.prisma.address.findUnique({ where: { id: addressId } });
  if (!address || address.customerUserId !== userId) {
    throw new ForbiddenException(`Unauthorized access to address`);
  }

  let resolvedStateCode: string | undefined = undefined;
  if (addressData.state) {
    resolvedStateCode = STATE_CODE_MAP[addressData.state] || undefined;
  }

  return this.prisma.$transaction(async (tx) => {
    if (addressData.isDefault === true) {
      await tx.address.updateMany({
        where: { customerUserId: userId, isDefault: true, NOT: { id: addressId } },
        data: { isDefault: false },
      });
    }

    return await tx.address.update({
      where: { id: addressId },
      data: {
        ...addressData,
        stateCode: resolvedStateCode,
      },
    });
  });
}




  async deleteAddress(userId: string, addressId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Delete where ID matches AND the owner is the current user
      await this.prisma.address.delete({
        where: {
          id: addressId,
          customerUserId: userId, // <-- Security check!
        },
      });
      return { success: true, message: 'Address deleted successfully.' };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(
          `Address with ID "${addressId}" not found or you don't have permission to delete it.`,
        );
      }
      throw error;
    }
  }
  
  async addToWaitlist(userId: string, dto: AddToWaitlistDto) {
    // 1. Fetch the product to ensure it exists and get the Business ID
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true, businessId: true, title: true }
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // 2. Fetch User to get email/phone if needed
    const user = await this.prisma.customerUser.findUnique({
      where: { id: userId },
      select: { email: true, phoneNumber: true }
    });

    if (!user) throw new NotFoundException('User not found');

    // 3. Check for Duplicate Request (Prevent Spam)
    const existingEntry = await this.prisma.productWaitlist.findFirst({
      where: {
        customerUserId: userId,
        productId: dto.productId,
        variantId: dto.variantId || null,
        status: 'PENDING', // Only check active requests
      }
    });

    if (existingEntry) {
      throw new ConflictException('You are already on the waitlist for this item.');
    }

    // 4. Create the Waitlist Entry
    return this.prisma.productWaitlist.create({
      data: {
        businessId: product.businessId,
        productId: dto.productId,
        variantId: dto.variantId,
        customerUserId: userId,
        email: user.email,        // Snapshot contact info
        phone: user.phoneNumber,  // Snapshot contact info
        channel: dto.channel || 'EMAIL',
        status: 'PENDING',
      }
    });
  }

  /**
   * Get all active waitlist requests for the logged-in user
   */
  async getMyWaitlist(userId: string) {
    return this.prisma.productWaitlist.findMany({
      where: { customerUserId: userId },
      include: {
        product: {
          select: { title: true, slug: true, images: true }
        },
        variant: {
          select: { sku: true, price: true } // Display variant details if specific
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
    async createReview(userId: string, productId: string, dto: CreateReviewDto, file?: any) {
    // 1. Verify the product exists and get its BusinessId
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { businessId: true }
    });
    if (!product) throw new NotFoundException('Product not found');

    // 2. Check if user already reviewed this product
    const existingReview = await this.prisma.review.findFirst({
      where: { productId, customerUserId: userId }
    });
    if (existingReview) throw new BadRequestException('You have already reviewed this product');

    // 3. Check if user has bought the product (Verified Purchase)
    const purchase = await this.prisma.order.findFirst({
      where: {
        customerUserId: userId,
        status: 'delivered', // Standard for verified purchases
        items: { some: { productId } }
      }
    });

    // 4. Handle Image resizing & upload (Max 1 image as requested)
    let imageUrl: string[] = [];
    if (file) {
      const resizedBuffer = await sharp(file.buffer)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      const url = await this.s3Service.uploadImage(
        resizedBuffer,
        `review-${userId}-${productId}.jpg`,
        'image/jpeg',
        'reviews' // Based on your allowed folders
      );
      imageUrl.push(url);
    }

    return this.prisma.review.create({
      data: {
        rating: parseInt(dto.rating),
        title: dto.title,
        comment: dto.comment,
        productId,
        customerUserId: userId,
        businessId: product.businessId,
        isVerifiedPurchase: !!purchase,
        images: imageUrl,
        status: 'APPROVED' // Default in your schema
      }
    });
  }

  async updateReview(userId: string, reviewId: string, dto: UpdateReviewDto, file?: any) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId }
    });

    if (!review) throw new NotFoundException('Review not found');
    if (review.customerUserId !== userId) throw new ForbiddenException('You can only edit your own reviews');

    let images = review.images;

    // If a new image is uploaded, replace the old one
    if (file) {
      // Delete old image from S3 if exists
      if (review.images.length > 0) {
        await this.s3Service.deleteImages(review.images);
      }

      const resizedBuffer = await sharp(file.buffer)
        .resize(800, 800, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toBuffer();

      const url = await this.s3Service.uploadImage(
        resizedBuffer,
        `review-update-${reviewId}.jpg`,
        'image/jpeg',
        'others'
      );
      images = [url];
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: dto.rating,
        title: dto.title,
        comment: dto.comment,
        images: images,
      }
    });
  }

  async getMyReviews(userId: string) {
    return this.prisma.review.findMany({
      where: { customerUserId: userId },
      include: { product: { select: { title: true, images: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }


   async createTicket(userId: string, dto: CreateTicketDto) {
    // Optional: Verify order ownership if orderId is provided
    if (dto.orderId) {
      const order = await this.prisma.order.findUnique({
        where: { id: dto.orderId },
      });
      if (!order || order.customerUserId !== userId) {
        throw new NotFoundException('Order not found or does not belong to you.');
      }
      // Auto-assign businessId from order if not provided (optional logic)
    }

    return this.prisma.$transaction(async (tx) => {
      // Create the Ticket
      const ticket = await tx.supportTicket.create({
        data: {
          customerUserId: userId,
          businessId: dto.businessId,
          orderId: dto.orderId,
          title: dto.title,
          description: dto.description, // Store initial description
          priority: dto.priority || 'MEDIUM',
          messages: {
            create: {
              senderType: 'CUSTOMER',
              customerUserId: userId,
              message: dto.description, // Initial message matches description
              attachmentUrls: dto.attachmentUrls || [],
            },
          },
        },
        include: { business: true },
      });

      // Notify the Seller (Business Owner)
      if (ticket.business?.ownerId) {
        await tx.sellerNotification.create({
          data: {
            userId: ticket.business.ownerId,
            title: `New Ticket: ${dto.title}`,
            message: `Customer opened a ticket for Order #${dto.orderId || 'General'}. Priority: ${ticket.priority}`,
            type: 'ALERT', // Assuming 'ALERT' is in your NotificationType enum
            metadata: { ticketId: ticket.id },
          },
        });
      }

      return ticket;
    });
  }

  // 2. Get All Tickets for Customer
  async getMyTickets(userId: string, status?: TicketStatus) {
    return this.prisma.supportTicket.findMany({
      where: {
        customerUserId: userId,
        ...(status && { status }), // Filter by status if provided
      },
      include: {
        business: { select: { name: true, logoUrl: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { lastMessageAt: 'desc' }, // Show most active tickets first
    });
  }

  // 3. Get Specific Ticket Details (Chat History)
  async getTicketDetails(userId: string, ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        business: { select: { name: true, logoUrl: true } },
        order: { select: { orderNumber: true, totalAmount: true, status: true } },
        messages: {
          orderBy: { createdAt: 'asc' }, // Oldest first (Chat style)
          include: {
            user: { select: { name: true, role: true } }, // Seller/Admin details
            customerUser: { select: { name: true } },     // Customer details
          }
        },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.customerUserId !== userId) throw new ForbiddenException('Access denied');

    return ticket;
  }

  // 4. Reply to a Ticket
  async replyToTicket(userId: string, ticketId: string, dto: ReplyTicketDto) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { business: true }
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.customerUserId !== userId) throw new ForbiddenException('Access denied');
    if (ticket.status === 'CLOSED') throw new BadRequestException('Cannot reply to a closed ticket.');

    return this.prisma.$transaction(async (tx) => {
      // Add Message
      const message = await tx.supportTicketMessage.create({
        data: {
          ticketId,
          senderType: 'CUSTOMER',
          customerUserId: userId,
          message: dto.message,
          attachmentUrls: dto.attachmentUrls || [],
        },
      });

      // Update Ticket Metadata
      await tx.supportTicket.update({
        where: { id: ticketId },
        data: {
          lastMessageAt: new Date(),
          // If ticket was resolved, re-open it because customer replied? 
          // Optional: status: ticket.status === 'RESOLVED' ? 'OPEN' : ticket.status 
        },
      });

      // Notify Seller
      await tx.sellerNotification.create({
        data: {
          userId: ticket.business.ownerId,
          title: `Reply on Ticket #${ticketId.slice(0, 4)}`,
          message: `${dto.message.substring(0, 50)}...`,
          type: 'ALERT',
          metadata: { ticketId },
        },
      });

      return message;
    });
  }

  // 5. Update Ticket Status (Resolve/Close)
  async updateTicketStatus(userId: string, ticketId: string, status: TicketStatus) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.customerUserId !== userId) throw new ForbiddenException('Access denied');

    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status },
    });
  }
// 6. Get Ticket(s) by Order ID
  async getTicketsByOrderId(userId: string, orderId: string) {
    // Verify the order belongs to the user first (Optional security check)
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { customerUserId: true }
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.customerUserId !== userId) throw new ForbiddenException('Access denied to this order.');

    return this.prisma.supportTicket.findMany({
      where: {
        customerUserId: userId,
        orderId: orderId,
      },
      include: {
        business: { select: { name: true, logoUrl: true } },
        _count: { select: { messages: true } },
        // Optional: Include the latest message to show preview
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { updatedAt: 'desc' }, // Most recent ticket first
    });
  }
}