import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MultipartFile } from 'fastify-multipart';
import { CreateBannerDto } from './dto/create-banner.dto';
import { S3Service } from '../products/utils/s3Service';
import { UpdateBusinessVerificationDto } from './dto/update-business-verification.dto';
import { CreateHomepageSectionDto } from './dto/create-homepage-section.dto';
import { Prisma } from '@prisma/client';
import { AdminProductFilterDto, UpdateProductPublishStatusDto } from './dto/product-verification.dto';
import { UpdateBusinessDetailsDto } from './dto/update-business-details.dto';
import { SettlementStatus } from '@prisma/client';
import { AdminReplyTicketDto, AdminTicketQueryDto, AdminUpdateTicketStatusDto } from './dto/admin-ticket.dto';
interface ParsedBannerFiles {
  bannerImage?: { buffer: Buffer; filename: string; mimetype: string };
  brandLogo?: { buffer: Buffer; filename: string; mimetype: string };
}
interface ParsedHomepageFiles {
  // Maps the item's index to its file data
  itemImages: Map<number, { buffer: Buffer; filename: string; mimetype: string }>;
}
@Injectable()
export class AdminService {
    constructor(
    private prisma: PrismaService,
    private s3Service: S3Service, // Make sure S3Service is provided in AdminModule
  ) {}

  async getDashboardStats() {
    // Use a transaction to run all count queries concurrently for best performance
    const [totalUsers, totalBusinesses, totalProducts] =
      await this.prisma.$transaction([
        this.prisma.user.count(),
        this.prisma.business.count(),
        this.prisma.product.count(),
      ]);

    return {
      totalUsers,
      totalBusinesses,
      totalProducts,
    };
  }







  async getFeaturedProducts() {
    // Fetch all featured products with related data
    const featuredProducts = await this.prisma.product.findMany({
      where: {
        isFeatured: true,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        business: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            isVerified: true,
            owner: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        variants: {
          where: {
            isDefault: true,
          },
          select: {
            price: true,
            stock: true,
            status: true,
          },
          take: 1,
        },
        _count: {
          select: {
            variants: true,
          },
        },
      },
      orderBy: [
        {
          category: {
            name: 'asc',
          },
        },
        {
          createdAt: 'desc',
        },
      ],
    });

    // Group products by category
    const categoriesMap = new Map();
    
    featuredProducts.forEach((product) => {
      const categoryId = product.category.id;
      
      if (!categoriesMap.has(categoryId)) {
        categoriesMap.set(categoryId, {
          categoryId: product.category.id,
          categoryName: product.category.name,
          categorySlug: product.category.slug,
          products: [],
        });
      }
      
      // Format the product data
      const formattedProduct = {
        id: product.id,
        title: product.title,
        description: product.description,
        slug: product.slug,
        images: product.images,
        isPublished: product.isPublished,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        business: {
          id: product.business.id,
          name: product.business.name,
          city: product.business.city,
          state: product.business.state,
          isVerified: product.business.isVerified,
          owner: product.business.owner,
        },
        variantCount: product._count.variants,
        defaultVariant: product.variants.length > 0 ? {
          price: Number(product.variants[0].price),
          stock: product.variants[0].stock,
          status: product.variants[0].status,
        } : null,
      };
      
      categoriesMap.get(categoryId).products.push(formattedProduct);
    });

    // Convert map to array and sort by category name
    const categories = Array.from(categoriesMap.values()).sort(
      (a, b) => a.categoryName.localeCompare(b.categoryName)
    );

    return {
      categories,
      totalFeaturedProducts: featuredProducts.length,
    };
  }

  async createBanner(
    dto: CreateBannerDto,
    files: ParsedBannerFiles, // <-- UPDATED type signature
  ) {
    // This check is now more direct
    if (!files.bannerImage) {
      throw new BadRequestException('A banner image is required.');
    }

    const bannerImageFile = files.bannerImage;
    const brandLogoFile = files.brandLogo; // Can be undefined

    const uploadedImageUrls: string[] = [];

    try {
      // 1. Upload Banner Image to S3
      // The logic now uses the buffer directly, no need for .toBuffer()
      const bannerImageUrl = await this.s3Service.uploadImage(
        bannerImageFile.buffer,
        bannerImageFile.filename,
        bannerImageFile.mimetype,
        "banners"
      );
      uploadedImageUrls.push(bannerImageUrl);

      // 2. Upload Optional Brand Logo to S3
      let brandLogoUrl: string | undefined = undefined;
      if (brandLogoFile) {
        brandLogoUrl = await this.s3Service.uploadImage(
          brandLogoFile.buffer,
          brandLogoFile.filename,
          brandLogoFile.mimetype,
          "banners"
        );
        uploadedImageUrls.push(brandLogoUrl);
      }

      // 3. Create the Banner record in the database (this part is unchanged)
      const banner = await this.prisma.promotionalBanner.create({
        data: {
          title: dto.title,
          discountText: dto.discountText,
          targetUrl: dto.targetUrl,
          position: dto.position,
          bannerImageUrl: bannerImageUrl,
          brandLogoUrl: brandLogoUrl,
        },
      });

      return {
        success: true,
        message: 'Promotional banner created successfully.',
        data: banner,
      };
    } catch (error) {
      // S3 rollback logic remains unchanged and is still critical
      if (uploadedImageUrls.length > 0) {
        console.error(
          `Database error after file upload. Rolling back S3 objects: ${uploadedImageUrls.join(', ')}`,
        );
        this.s3Service.deleteImages(uploadedImageUrls);
      }
      
      throw error;
    }
  }


    async deleteBanner(bannerId: number) {
    // 1. Find the banner to ensure it exists and get image URLs for cleanup.
    const banner = await this.prisma.promotionalBanner.findUnique({
      where: { id: bannerId },
    });

    if (!banner) {
      throw new NotFoundException(`Banner with ID ${bannerId} not found.`);
    }

    // 2. Collect the URLs of images that need to be deleted from S3.
    const imagesToDelete: string[] = [];
    if (banner.bannerImageUrl) {
      imagesToDelete.push(banner.bannerImageUrl);
    }
    if (banner.brandLogoUrl) {
      imagesToDelete.push(banner.brandLogoUrl);
    }

    // 3. Delete the banner record from the database.
    await this.prisma.promotionalBanner.delete({
      where: { id: bannerId },
    });

    // 4. After a successful DB deletion, delete the associated images from S3.
    // We do this after to ensure we don't have orphaned DB records if S3 fails.
    if (imagesToDelete.length > 0) {
      try {
        await this.s3Service.deleteImages(imagesToDelete);
      } catch (s3Error) {
        // Log the error for monitoring, but don't fail the entire request
        // since the primary resource (the banner record) has been successfully deleted.
        console.error(
          `Successfully deleted banner ID ${bannerId} from DB, but failed to delete associated S3 images.`,
          { urls: imagesToDelete, error: s3Error },
        );
      }
    }

    return {
      success: true,
      message: `Banner with ID ${bannerId} has been deleted successfully.`,
    };
  }

  async getAllBusinesses() {
    const businesses = await this.prisma.business.findMany({
      select: {
        id: true, // Always good to include the ID
        name: true,
        city: true,
        state: true,
        phone: true,
        category: true,
        isVerified: true, // Useful for an admin view
        createdAt: true,
        owner: {
          select: {
            email: true,
            name: true, // Owner's name is also good to have
          },
        },
      },
      orderBy: {
        // Sort by most recently created
        createdAt: 'desc',
      },
    });

    return businesses;
  }

    async updateBusinessVerification(
    businessId: string,
    dto: UpdateBusinessVerificationDto,
  ) {
    // First, ensure the business actually exists
    const businessExists = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!businessExists) {
      throw new NotFoundException(`Business with ID "${businessId}" not found.`);
    }

    // If it exists, perform the update
    return this.prisma.business.update({
      where: { id: businessId },
      data: {
        isVerified: dto.isVerified,
      },
    });
  }

async getProductsForVerification(query: AdminProductFilterDto) {
    // FIX: Provide explicit defaults here to satisfy TypeScript
    console.log(AdminProductFilterDto);
    
    const page = query.page || 1;
    const limit = query.limit || 10;
    const { businessId, isPublished, needsVerification } = query;
    
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (businessId) where.businessId = businessId;
    if (isPublished !== undefined) where.isPublished = isPublished;
    
    if (needsVerification) {
      where.isFeatured = true;
      where.isPublished = false;
    }

    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          isPublished: true,
          isFeatured: true,
          updatedAt: true,
          business: { select: { name: true } },
          _count: { select: { variants: true } }
        },
        orderBy: { updatedAt: 'desc' }
      }),
      this.prisma.product.count({ where })
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit) // Now 'limit' is guaranteed to be a number
      }
    };
  }
  // 2. Fetch full details including variants for deep verification
  async getProductDetailForAdmin(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        business: { select: { name: true, ownerId: true } },
        category: { select: { name: true } },
        variants: true, // Includes all prices, stock, and attributes
      }
    });

    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  // 3. Update publish status and notify seller
  async updateProductPublishStatus(productId: string, dto: UpdateProductPublishStatusDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { business: true }
    });

    if (!product) throw new NotFoundException('Product not found');

    return this.prisma.$transaction(async (tx) => {
      // A. Update the product
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { isPublished: dto.isPublished }
      });

      // B. If remarks are provided (rejection or feedback), send notification
      if (dto.remarks) {
        await tx.sellerNotification.create({
          data: {
            userId: product.business.ownerId,
            title: dto.isPublished ? 'Product Published' : 'Product Action Required',
            message: `Product: "${product.title}". Admin Feedback: ${dto.remarks}`,
            type: 'SYSTEM', // or ALERT
            metadata: { productId: product.id }
          }
        });
      }

      return updatedProduct;
    });
  }

  // 1. Fetch business overview with stats
 async getBusinessOverview(businessId: string) {
    // A. Fetch Profile & Entity Counts
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: {
        owner: {
          select: { id: true, name: true, email: true }, // Removed 'phone' as it is not in User model
        },
        _count: {
          select: {
            products: true,
            reviews: true,
            // 'orders' removed because there is no direct relation
          },
        },
      },
    });

    if (!business) throw new NotFoundException('Business not found');

    // B. Calculate Online Revenue (Using SellerSettlement)
    // Since 'Order' doesn't have businessId, we use the settlement table which tracks
    // exactly how much money this specific business made from orders.
    const settlementStats = await this.prisma.sellerSettlement.aggregate({
      where: {
        businessId: businessId,
      },
      _sum: {
        grossAmount: true, // The total value of items sold
      },
      _count: {
        id: true, // Number of settlement records (approx. number of orders)
      },
    });

    // C. Calculate POS Revenue (Using Sale)
    const posStats = await this.prisma.sale.aggregate({
      where: {
        businessId: businessId,
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      profile: business,
      statistics: {
        // Online Stats
        // FIXED: Using 'settlementStats' variable, not the Enum
        onlineRevenue: settlementStats._sum.grossAmount || 0, 
        onlineOrderCount: settlementStats._count.id || 0,
        
        // POS Stats
        posRevenue: posStats._sum.totalAmount || 0,
        posSaleCount: posStats._count.id || 0,
        
        // General Stats
        totalProducts: business._count.products,
        totalReviews: business._count.reviews,
      },
    };
  }

  // 2. Fetch All Products of a Business
  async getBusinessProducts(businessId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where: { businessId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { name: true } },
          _count: { select: { reviews: true } },
        },
      }),
      this.prisma.product.count({ where: { businessId } }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 3. Update Business Details
  async updateBusinessDetails(businessId: string, dto: UpdateBusinessDetailsDto) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new NotFoundException('Business not found');

    return this.prisma.business.update({
      where: { id: businessId },
      data: {
        ...dto,
        kycVerifiedAt: dto.isVerified ? new Date() : undefined,
      },
    });
  }

  async getAllTickets(query: AdminTicketQueryDto) {
    const { page = 1, limit = 10, status, priority, businessId, customerUserId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SupportTicketWhereInput = {
      ...(status && { status }),
      ...(priority && { priority }),
      ...(businessId && { businessId }),
      ...(customerUserId && { customerUserId }),
    };

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastMessageAt: 'desc' },
        include: {
          // 1. Business Info
          business: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              owner: { select: { name: true, email: true } }
            }
          },
          // 2. Customer Info
          customerUser: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
              picture: true
            }
          },
          // 3. Order & Product Context
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              status: true,
              createdAt: true,
              items: {
                take: 1, // Get first item for display context
                select: {
                  variant: {
                    select: {
                      product: {
                        select: { title: true, images: true }
                      }
                    }
                  }
                }
              }
            }
          },
          // 4. Activity
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return {
      data: tickets,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTicketStats() {
    const stats = await this.prisma.supportTicket.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const result = {
      OPEN: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      CLOSED: 0,
      TOTAL: 0,
    };

    stats.forEach((s) => {
      result[s.status] = s._count.id;
      result.TOTAL += s._count.id;
    });

    return result;
  }

  async getTicketDetails(ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        business: { select: { id: true, name: true, ownerId: true } },
        customerUser: { select: { id: true, name: true, email: true } },
        order: { select: { id: true, orderNumber: true, totalAmount: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { name: true, role: true } }, 
            customerUser: { select: { name: true } },
          },
        },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async replyAsAdmin(adminUserId: string, ticketId: string, dto: AdminReplyTicketDto) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { business: true }
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Message
      const message = await tx.supportTicketMessage.create({
        data: {
          ticketId,
          senderType: 'ADMIN',
          userId: adminUserId,
          message: dto.message,
          attachmentUrls: dto.attachmentUrls || [],
        },
      });

      // 2. Update Status
      await tx.supportTicket.update({
        where: { id: ticketId },
        data: {
          lastMessageAt: new Date(),
          status: 'IN_PROGRESS',
        },
      });

      // 3. Notifications (Both sides)
      if (ticket.customerUserId) {
         await tx.customerNotification.create({
          data: {
            customerUserId: ticket.customerUserId,
            title: `Support Update`,
            message: `Admin: ${dto.message.substring(0, 40)}...`,
            type: 'SYSTEM',
            metadata: { ticketId: ticket.id },
          },
        });
      }
      
      await tx.sellerNotification.create({
        data: {
          userId: ticket.business.ownerId,
          title: `Support Update`,
          message: `Admin: ${dto.message.substring(0, 40)}...`,
          type: 'SYSTEM',
          metadata: { ticketId: ticket.id },
        },
      });

      return message;
    });
  }

  async updateTicketStatus(ticketId: string, dto: AdminUpdateTicketStatusDto) {
    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: dto.status },
    });
  }
}