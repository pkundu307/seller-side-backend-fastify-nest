// src/business/business.service.ts

import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  Inject,
  ForbiddenException
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { slugify } from '../utils/slugify';
import { AccountType, Prisma, VariantStatus } from '@prisma/client';
import { IndustryType } from '@prisma/client';
import { RABBITMQ_SERVICE } from '../rabbitmq/rabbitmq.module'; // <--- Import Token
import { ClientProxy } from '@nestjs/microservices';
import { S3Service } from 'src/products/utils/s3Service';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Injectable()
export class BusinessService {
  constructor(private readonly prisma: PrismaService,
    @Inject(RABBITMQ_SERVICE) private readonly rmqClient: ClientProxy,
    private readonly s3Service: S3Service, // Inject S3 Service

    
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
    [IndustryType.RETAIL_GENERAL]:   { isBarcodeEnabled: true, isStockAlertEnabled: true },
    [IndustryType.RETAIL_PHARMACY]:  { isBatchingEnabled: true, expiryAlertDays: 90, requiresDoctor: true },
    [IndustryType.RETAIL_FASHION]:   { isVariantMatrixEnabled: true, hasFittingRooms: true },
    [IndustryType.RESTAURANT_QSR]:   { autoPrintKOT: true, hasTokenDisplay: true },
    [IndustryType.RESTAURANT_DINEIN]:{ hasTableManagement: true, serviceChargePct: 5, enableKOT: true },
    [IndustryType.SERVICE_SALON]:    { isAppointmentEnabled: true, staffCommissionEnabled: true },
    [IndustryType.TOUR_AND_TRAVEL]:  { isBookingEnabled: true, visaProcessingEnabled: true },
  };

  const defaultConfig = industryConfigs[dto.industryType] || {};

  try {
    // 3. Create Business
    const business = await this.prisma.business.create({
      data: {
        name: dto.name,
        // Pass undefined (not null) when absent so Prisma stores NULL
        gstNumber: dto.gstNumber ?? null,
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
            closingBalance: 0,
          },
        },
        warehouses: {
          create: {
            name: 'Main Store',
            isDefault: true,
          },
        },
        agreementLogs: {
          create: {
            version: dto.sellerAgreementVersion,
            acceptedAt: new Date(),
          },
        },
      },
      include: {
        owner: {
          select: { email: true, name: true },
        },
      },
    });

    // 4. Send Welcome Email via RabbitMQ
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
        slug: business.slug,
      },
    };

    this.rmqClient.emit('send_notification', notificationPayload);

    return business;

  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = error.meta?.target as string[];
        if (target?.includes('gstNumber')) {
          throw new ConflictException('A business with this GST Number already exists.');
        }
        if (target?.includes('slug')) {
          throw new ConflictException('A business with this name already exists.');
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
  

async getBusinessForSettingById(businessId: string, userId: string) {
  const business = await this.prisma.business.findUnique({
    where: { id: businessId },
    include: {
      owner: {
        select: { id: true, name: true, email: true, image: true },
      },
      bankAccounts: {
        where:   { isEnabled: true },
        orderBy: { isDefault: 'desc' },
        select: {
          id:             true,
          accountName:    true,
          accountType:    true,
          bankName:       true,
          bankAccountNo:  true,
          bankIfscCode:   true,
          upiId:          true,
          closingBalance: true,
          isDefault:      true,
          isEnabled:      true,
        },
      },
      warehouses: {
        select: {
          id:        true,
          name:      true,
          isDefault: true,
          address:   true,
        },
      },
      // KYC documents with full status info
      kycDocuments: {
        orderBy: { uploadedAt: 'desc' },
        select: {
          id:          true,
          type:        true,
          documentUrl: true,
          status:      true,
          remarks:     true,
          uploadedAt:  true,
          verifiedAt:  true,
        },
      },
      // Roles summary
      roles: {
        select: {
          id:          true,
          name:        true,
          isDefault:   true,
          description: true,
        },
      },
    },
  });

  if (!business) throw new NotFoundException('Business not found');

  // Security: Owner OR authorized BusinessUser
  if (business.ownerId !== userId) {
    const isAuthorized = await this.prisma.businessUser.findUnique({
      where: {
        userId_businessId: { userId, businessId },
      },
    });
    if (!isAuthorized) {
      throw new ForbiddenException('You do not have access to this business.');
    }
  }

  // Strip sensitive fields before returning
  const {
    stripeCustomerId,
    bankDetails,
    gstPortalPasswordEnc,
    gstPortalUsername,
    ...safeData
  } = business as any;

  return safeData;
}
async updateBusiness(
  businessId: string,
  userId: string,
  dto: UpdateBusinessDto,
  files?: {
    logo?:      Buffer;
    banner?:    Buffer;
    signature?: Buffer;
    kycFiles?:  Partial<Record<
      'PAN' | 'GST_CERTIFICATE' | 'BANK_PROOF' | 'ADDRESS_PROOF',
      { buffer: Buffer; mimetype: string; originalname: string }
    >>;
  }
) {
  // 1. Verify Ownership & Existence
  const business = await this.prisma.business.findUnique({
    where: { id: businessId },
  });

  if (!business)                   throw new NotFoundException('Business not found');
  if (business.ownerId !== userId) throw new ForbiddenException('You do not have permission to update this business');

  const uploadedUrlsForRollback: string[] = [];
  const updates: any = { ...dto };

  // Remove nested objects — handled separately below
  delete updates.invoiceConfig;
  delete updates.kycDocuments;

  try {
    // 2. Flatten invoiceConfig into top-level DB columns
    if (dto.invoiceConfig) {
      const {
        invoicePrefix, purchaseInvoicePrefix,
        invoiceStartNumber, purchaseStartNumber,
        fiscalYearStart, invoiceNotes, invoiceTerms,
      } = dto.invoiceConfig;

      if (invoicePrefix         !== undefined) updates.invoicePrefix         = invoicePrefix;
      if (purchaseInvoicePrefix !== undefined) updates.purchaseInvoicePrefix = purchaseInvoicePrefix;
      if (invoiceStartNumber    !== undefined) updates.invoiceStartNumber    = invoiceStartNumber;
      if (purchaseStartNumber   !== undefined) updates.purchaseStartNumber   = purchaseStartNumber;
      if (fiscalYearStart       !== undefined) updates.fiscalYearStart       = fiscalYearStart;
      if (invoiceNotes          !== undefined) updates.invoiceNotes          = invoiceNotes;
      if (invoiceTerms          !== undefined) updates.invoiceTerms          = invoiceTerms;
    }

    // 3. Remove deprecated / non-Prisma fields
    delete updates.bankDetails;

    // 4. Strip empty strings from unique fields — prevents constraint errors
    const UNIQUE_FIELDS = ['panNumber', 'gstNumber', 'email', 'slug'];
    for (const field of UNIQUE_FIELDS) {
      if (updates[field] === '' || updates[field] === null) {
        delete updates[field];
      }
    }

    // 5. Strip ALL remaining empty strings
    for (const key of Object.keys(updates)) {
      if (updates[key] === '') {
        delete updates[key];
      }
    }

    // 6. Handle Logo Upload
    if (files?.logo) {
      console.log('[UPDATE_BUSINESS] 🔄 Uploading logo...');
      if (business.logoUrl) {
        await this.s3Service
          .deleteImages([business.logoUrl])
          .catch((err) => console.error('[UPDATE_BUSINESS] Failed to delete old logo:', err));
      }
      updates.logoUrl = await this.s3Service.uploadImage(
        files.logo,
        `logo-${business.slug}.png`,
        'image/png',
        'business',
      );
      uploadedUrlsForRollback.push(updates.logoUrl);
      console.log('[UPDATE_BUSINESS] ✅ Logo uploaded:', updates.logoUrl);
    }

    // 7. Handle Banner Upload
    if (files?.banner) {
      console.log('[UPDATE_BUSINESS] 🔄 Uploading banner...');
      if (business.bannerUrl) {
        await this.s3Service
          .deleteImages([business.bannerUrl])
          .catch((err) => console.error('[UPDATE_BUSINESS] Failed to delete old banner:', err));
      }
      updates.bannerUrl = await this.s3Service.uploadImage(
        files.banner,
        `banner-${business.slug}.png`,
        'image/png',
        'business',
      );
      uploadedUrlsForRollback.push(updates.bannerUrl);
      console.log('[UPDATE_BUSINESS] ✅ Banner uploaded:', updates.bannerUrl);
    }

    // 8. Handle Signature Upload
    if (files?.signature) {
      console.log('[UPDATE_BUSINESS] 🔄 Uploading signature...');
      if (business.authorizedSignatorySignatureUrl) {
        await this.s3Service
          .deleteImages([business.authorizedSignatorySignatureUrl])
          .catch((err) => console.error('[UPDATE_BUSINESS] Failed to delete old signature:', err));
      }
      updates.authorizedSignatorySignatureUrl = await this.s3Service.uploadImage(
        files.signature,
        `signature-${business.slug}.png`,
        'image/png',
        'business',
      );
      uploadedUrlsForRollback.push(updates.authorizedSignatorySignatureUrl);
      console.log('[UPDATE_BUSINESS] ✅ Signature uploaded:', updates.authorizedSignatorySignatureUrl);
    }

    // 9. Handle KYC Documents
    const KYC_TYPES = ['PAN', 'GST_CERTIFICATE', 'BANK_PROOF', 'ADDRESS_PROOF'] as const;
    type KycType = typeof KYC_TYPES[number];

    // Mime type → file extension map
    const EXT_MAP: Record<string, string> = {
      'image/jpeg':      'jpg',
      'image/jpg':       'jpg',
      'image/png':       'png',
      'image/webp':      'webp',
      'application/pdf': 'pdf',
    };

    const kycUrlMap: Partial<Record<KycType, string>> = {};

    // 9a. URL-based KYC docs from DTO (pre-uploaded by client)
    if (dto.kycDocuments) {
      for (const type of KYC_TYPES) {
        const url = (dto.kycDocuments as any)[type];
        if (url?.trim()) kycUrlMap[type] = url.trim();
      }
    }

    // 9b. File buffer KYC uploads with correct mime type & extension
    if (files?.kycFiles) {
      for (const type of KYC_TYPES) {
        const fileData = files.kycFiles[type];
        if (fileData) {
          const { buffer, mimetype, originalname } = fileData;

          // Derive correct extension from actual mime type
          const ext      = EXT_MAP[mimetype] ?? originalname.split('.').pop() ?? 'bin';
          const filename = `kyc-${type.toLowerCase()}-${businessId}.${ext}`;

          console.log(`[UPDATE_BUSINESS] 🔄 Uploading KYC doc: ${type} | mime: ${mimetype} | file: ${filename}`);

          const url = await this.s3Service.uploadImage(
            buffer,
            filename,
            mimetype,   // ← actual mime type, not hardcoded
            'kyc',
          );
          kycUrlMap[type] = url;
          uploadedUrlsForRollback.push(url);
          console.log(`[UPDATE_BUSINESS] ✅ KYC ${type} uploaded:`, url);
        }
      }
    }

    // 9c. Manual findFirst + create/update (no @@unique constraint needed)
    if (Object.keys(kycUrlMap).length > 0) {
      console.log('[UPDATE_BUSINESS] 🔄 Saving KYC documents...');

      await Promise.all(
        (Object.entries(kycUrlMap) as [KycType, string][]).map(async ([type, documentUrl]) => {
          const existing = await this.prisma.sellerKycDocument.findFirst({
            where: { businessId, type },
          });

          if (existing) {
            await this.prisma.sellerKycDocument.update({
              where: { id: existing.id },
              data: {
                documentUrl,
                status:     'PENDING',
                remarks:    null,
                verifiedAt: null,
                uploadedAt: new Date(),
              },
            });
          } else {
            await this.prisma.sellerKycDocument.create({
              data: {
                businessId,
                type,
                documentUrl,
                status: 'PENDING',
              },
            });
          }
        })
      );

      // Reset overall business KYC status to PENDING
      updates.kycStatus      = 'PENDING';
      updates.kycSubmittedAt = new Date();
      updates.kycRejectedAt  = null;
      updates.kycRemarks     = null;
      console.log('[UPDATE_BUSINESS] ✅ KYC documents saved, business kycStatus → PENDING');
    }

    // 10. Perform DB Update
    console.log('[UPDATE_BUSINESS] 🔄 Saving to database...');
    const updatedBusiness = await this.prisma.business.update({
      where: { id: businessId },
      data:  updates,
    });
    console.log('[UPDATE_BUSINESS] ✅ Business updated successfully:', updatedBusiness.id);

    return updatedBusiness;

  } catch (error) {
    console.error('[UPDATE_BUSINESS] ❌ Error:', error);

    // Rollback any newly uploaded S3 files on failure
    if (uploadedUrlsForRollback.length > 0) {
      console.warn('[UPDATE_BUSINESS] Rolling back S3 uploads...');
      await this.s3Service
        .deleteImages(uploadedUrlsForRollback)
        .catch((err) => console.error('[UPDATE_BUSINESS] S3 rollback failed:', err));
      console.warn('[UPDATE_BUSINESS] ✅ S3 rollback complete.');
    }

    throw error;
  }
}

/**
 * Fetches all published products for a business (public, customer-facing).
 */
async getBusinessProducts(businessId: string, query: { page: number; limit: number }) {
  const { page = 1, limit = 12 } = query;
  const skip = (page - 1) * limit;

  // 1. Check business exists
  const business = await this.prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, name: true, state: true, logoUrl: true },
  });

  if (!business) {
    throw new NotFoundException(`Business with ID "${businessId}" not found`);
  }

  // 2. Fetch products with pagination
  const [products, total] = await Promise.all([
    this.prisma.product.findMany({
      where: {
        businessId,
        isPublished: true,
        isFeatured: false,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        slug: true,
        images: true,
        isCustomizable: true,
        _count: { select: { reviews: true } },
        variants: {
          where: { isDefault: true, deletedAt: null, status: VariantStatus.ACTIVE },
          select: { price: true, mrp: true },
          take: 1,
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    this.prisma.product.count({
      where: {
        businessId,
        isPublished: true,
        deletedAt: null,
      },
    }),
  ]);

  // 3. Format response
  const formattedProducts = products.map((p) => {
    const variant = p.variants?.[0] ?? null;

    return {
      id: p.id,
      title: p.title,
      description: p.description,
      slug: p.slug,
      numberOfReviews: p._count?.reviews ?? 0,
      price: variant?.price?.toString() ?? '0',
      mrp: variant?.mrp?.toString() ?? '0',
      images: p.images ?? [],
      isCustomizable: p.isCustomizable.toString(),
    };
  });

  return {
    business: {
      name: business.name,
      state: business.state,
      logo: business.logoUrl,
    },
    products: formattedProducts,
    pagination: {
      total,
      page,
      limit,
      lastPage: Math.ceil(total / limit),
    },
  };
}
}