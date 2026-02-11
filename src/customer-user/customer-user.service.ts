import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Address, CustomerUser, Prisma } from '@prisma/client';
import { UpdateAddressDto } from './dto/update-address.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { AddToWaitlistDto } from './dto/add-to-waitlist.dto';
import { S3Service } from 'src/products/utils/s3Service';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';
import * as sharp from 'sharp';

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
    return this.prisma.$transaction(async (tx) => {
      // 1. If the new address is being set as default...
      if (addressData.isDefault === true) {
        // ...then set all OTHER addresses for this user to isDefault: false.
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

      // 2. Now, create the new address with the correct default status.
      const newAddress = await tx.address.create({
        data: {
          ...addressData,
          customerUserId: userId,
        },
      });

      return newAddress;
    });
  }

  async updateAddress(
    userId: string,
    addressId: string,
    addressData: UpdateAddressDto,
  ): Promise<Address> {
    // First, verify the address exists and belongs to the user.
    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw new NotFoundException(`Address with ID "${addressId}" not found.`);
    }
    if (address.customerUserId !== userId) {
      throw new ForbiddenException(`You do not have permission to update this address.`);
    }

    // Now perform the update within a transaction
    return this.prisma.$transaction(async (tx) => {
      // 1. If the user is trying to set this address as the new default...
      if (addressData.isDefault === true) {
        // ...then unset any other address that is currently the default for this user.
        await tx.address.updateMany({
          where: {
            customerUserId: userId,
            isDefault: true,
            // Exclude the current address from this update in case it's already the default
            NOT: { id: addressId }, 
          },
          data: {
            isDefault: false,
          },
        });
      }

      // 2. Now, update the target address with the new data.
      const updatedAddress = await tx.address.update({
        where: { id: addressId },
        data: addressData,
      });

      return updatedAddress;
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

}