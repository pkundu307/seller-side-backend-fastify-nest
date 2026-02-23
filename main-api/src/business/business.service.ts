// src/business/business.service.ts

import { 
  Injectable, 
  ConflictException, 
  InternalServerErrorException, 
  NotFoundException 
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { slugify } from '../utils/slugify'; 
import { AccountType, Prisma } from '@prisma/client';
import { IndustryType } from '@prisma/client';

@Injectable()
export class BusinessService {
  constructor(private readonly prisma: PrismaService) {}

  // ========================================================
  // CREATE BUSINESS
  // ========================================================
async createBusiness(dto: CreateBusinessDto, ownerId: string) {
    // 1. Generate and Validate Slug
    let slug = slugify(dto.name);
    const existingSlug = await this.prisma.business.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // 2. Define Industry-Specific Default Configurations
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
      // 3. Atomic Transaction: Create Business + Defaults + Agreement Log
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

          // --- AGREEMENT DATA MAPPING ---
          sellerAgreementAccepted: dto.sellerAgreementAccepted,
          sellerAgreementVersion: dto.sellerAgreementVersion,
          sellerAgreementAcceptedAt: new Date(), // Capture exact timestamp
          
          // Create a Default Cash Drawer for POS
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

          // Create a Default Warehouse/Store Room
          warehouses: {
            create: {
              name: 'Main Store',
              isDefault: true,
            }
          },

          // Optional: Create an initial audit log for agreement acceptance
          agreementLogs: {
            create: {
              version: dto.sellerAgreementVersion,
              acceptedAt: new Date(),
              // ipAddress: ... (If you have access to request object here, pass it in)
            }
          }
        },
      });

      return business;

    } catch (error) {
      // 4. Handle Specific DB Errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = error.meta?.target as string[];
          if (target?.includes('gstNumber')) {
            throw new ConflictException('A business with this GST Number already exists.');
          }
        }
      }
      // this.logger.error(`Business Creation Failed: ${error.message}`);
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