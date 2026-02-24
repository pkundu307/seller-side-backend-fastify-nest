// src/business/business.service.ts

import { 
  Injectable, 
  ConflictException, 
  InternalServerErrorException, 
  NotFoundException, 
  Inject
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { slugify } from '../utils/slugify'; 
import { AccountType, Prisma } from '@prisma/client';
import { IndustryType } from '@prisma/client';
import { RABBITMQ_SERVICE } from '../rabbitmq/rabbitmq.module'; // <--- Import Token
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class BusinessService {
  constructor(private readonly prisma: PrismaService,
    @Inject(RABBITMQ_SERVICE) private readonly rmqClient: ClientProxy,

    
  ) {}

  // ========================================================
  // CREATE BUSINESS
  // ========================================================
async createBusiness(dto: CreateBusinessDto, ownerId: string) {
    // 1. Generate Slug
    let slug = slugify(dto.name);
    const existingSlug = await this.prisma.business.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // 2. Default Configs
    const industryConfigs: Record<IndustryType, any> = {
      [IndustryType.RETAIL_GENERAL]: { isBarcodeEnabled: true, isStockAlertEnabled: true },
      [IndustryType.RETAIL_PHARMACY]: { isBatchingEnabled: true, expiryAlertDays: 90, requiresDoctor: true },
      [IndustryType.RETAIL_FASHION]: { isVariantMatrixEnabled: true, hasFittingRooms: true },
      [IndustryType.RESTAURANT_QSR]: { autoPrintKOT: true, hasTokenDisplay: true },
      [IndustryType.RESTAURANT_DINEIN]: { hasTableManagement: true, serviceChargePct: 5, enableKOT: true },
      [IndustryType.SERVICE_SALON]: { isAppointmentEnabled: true, staffCommissionEnabled: true },
      [IndustryType.TOUR_AND_TRAVEL]: { isBookingEnabled: true, visaProcessingEnabled: true },
    };

    const defaultConfig = industryConfigs[dto.industryType] || {};

    try {
      // 3. Create Business (Atomic Transaction)
      const business = await this.prisma.business.create({
        data: {
          name: dto.name,
          gstNumber: dto.gstNumber,
          address: dto.address,
          city: dto.city,
          state: dto.state,
          country: dto.country,
          postalCode: dto.postalCode,
          phone: dto.phone,
          category: dto.category || 'General',
          industryType: dto.industryType,
          businessConfig: defaultConfig,
          ownerId,
          slug,
          sellerAgreementAccepted: dto.sellerAgreementAccepted,
          sellerAgreementVersion: dto.sellerAgreementVersion,
          sellerAgreementAcceptedAt: new Date(),
          
          bankAccounts: {
            create: {
              accountName: 'Cash Drawer',
              accountType: AccountType.CASH,
              isDefault: true,
              isEnabled: true,
              openingBalance: 0,
              closingBalance: 0
            }
          },
          warehouses: {
            create: {
              name: 'Main Store',
              isDefault: true,
            }
          },
          agreementLogs: {
            create: {
              version: dto.sellerAgreementVersion,
              acceptedAt: new Date(),
            }
          }
        },
        // ✅ INCLUDE OWNER TO GET EMAIL
        include: {
          owner: {
            select: { email: true, name: true }
          }
        }
      });

      // 4. ✅ SEND WELCOME EMAIL VIA RABBITMQ
      // This matches the struct expected by your Go service
      const notificationPayload = {
        recipientId: ownerId,
        recipientEmail: business.owner.email,
        recipientType: 'SELLER',
        notificationId: `WELCOME_${business.id}`,
        title: 'Welcome to Jottosop Business!',
        message: `Congratulations! Your business "${business.name}" has been successfully registered on Jottosop. You can now start adding products and managing sales.`,
        type: 'SYSTEM',
        metadata: {
          businessId: business.id,
          slug: business.slug
        }
      };

      // Emit sends the message to the queue asynchronously
      this.rmqClient.emit('send_notification', notificationPayload);

      return business;

    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = error.meta?.target as string[];
          if (target?.includes('gstNumber')) {
            throw new ConflictException('A business with this GST Number already exists.');
          }
        }
      }
      throw new InternalServerErrorException('Failed to create business profile.');
    }
  }

  // ========================================================
  // READ OPERATIONS
  // ========================================================
  
  // Get all businesses owned by a specific user
  async getAllBusinesses(ownerId: string) {
    return this.prisma.business.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { products: true} // Optional: Return counts of products/orders
        }
      }
    });
  }

  // Get a single business by ID
  async getBusinessById(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }
    return business;
  }

  // Get a single business by Slug (Useful for frontend public pages)
  async getBusinessBySlug(slug: string) {
    const business = await this.prisma.business.findUnique({
      where: { slug },
      include: {
        products: { take: 10 } // Optional: Include first 10 products
      }
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }
    return business;
  }

  // ========================================================
  // UPDATE OPERATIONS
  // ========================================================
  
  async updateBusiness(businessId: string, ownerId: string, data: Partial<CreateBusinessDto>) {
    // Check if business exists and belongs to user
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, ownerId }
    });

    if (!business) {
      throw new NotFoundException('Business not found or you do not have permission');
    }

    // Logic: If name changes, do we update slug? 
    // Usually NO (to preserve SEO), but if you want to, uncomment below:
    /*
    let newSlug = undefined;
    if (data.name && data.name !== business.name) {
       newSlug = slugify(data.name);
       // ... add uniqueness check here like in create ...
    }
    */

    return this.prisma.business.update({
      where: { id: businessId },
      data: {
        ...data,
        // slug: newSlug // Update if you enabled logic above
      }
    });
  }
}