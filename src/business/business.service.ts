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

@Injectable()
export class BusinessService {
  constructor(private readonly prisma: PrismaService) {}

  // ========================================================
  // CREATE BUSINESS
  // ========================================================
  async createBusiness(dto: CreateBusinessDto, ownerId: string) {
    // 1. Generate Slug
    let slug = slugify(dto.name);

    // 2. Ensure Slug Uniqueness
    const existingSlug = await this.prisma.business.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    try {
      // 3. Create Business AND Cash Drawer in one Atomic Transaction
      const business = await this.prisma.business.create({
        data: {
          ...dto,
          ownerId,
          slug,
          
          // --- NEW: Automatically create the Cash Entity ---
          bankAccounts: {
            create: {
              accountName: 'Cash Drawer', // Standard Name
              accountType: AccountType.CASH, // Use the Enum
              isDefault: true, // Mark as default for POS
              isEnabled: true,
              openingBalance: 0,
              closingBalance: 0
            }
          }
        },
      });

      return business;

    } catch (error) {
      // 4. Handle Unique Constraint Violations
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = error.meta?.target as string[];
          if (target && target.includes('gstNumber')) {
            throw new ConflictException('A business with this GST Number already exists.');
          }
        }
      }
      throw new InternalServerErrorException('Could not create business');
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