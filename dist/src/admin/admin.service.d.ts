import { PrismaService } from '../prisma/prisma.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { S3Service } from '../products/utils/s3Service';
import { UpdateBusinessVerificationDto } from './dto/update-business-verification.dto';
interface ParsedBannerFiles {
    bannerImage?: {
        buffer: Buffer;
        filename: string;
        mimetype: string;
    };
    brandLogo?: {
        buffer: Buffer;
        filename: string;
        mimetype: string;
    };
}
export declare class AdminService {
    private prisma;
    private s3Service;
    constructor(prisma: PrismaService, s3Service: S3Service);
    getDashboardStats(): Promise<{
        totalUsers: number;
        totalBusinesses: number;
        totalProducts: number;
    }>;
    getFeaturedProducts(): Promise<{
        categories: any[];
        totalFeaturedProducts: number;
    }>;
    createBanner(dto: CreateBannerDto, files: ParsedBannerFiles): Promise<{
        success: boolean;
        message: string;
        data: {
            id: number;
            createdAt: Date;
            title: string;
            updatedAt: Date;
            position: number;
            isActive: boolean;
            discountText: string | null;
            targetUrl: string;
            bannerImageUrl: string;
            brandLogoUrl: string | null;
        };
    }>;
    deleteBanner(bannerId: number): Promise<{
        success: boolean;
        message: string;
    }>;
    getAllBusinesses(): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        category: string;
        city: string;
        state: string;
        phone: string;
        isVerified: boolean;
        owner: {
            email: string;
            name: string | null;
        };
    }[]>;
    updateBusinessVerification(businessId: string, dto: UpdateBusinessVerificationDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        address: string;
        category: string;
        description: string | null;
        slug: string | null;
        updatedAt: Date;
        isActive: boolean;
        city: string;
        state: string;
        postalCode: string;
        country: string;
        rating: import("@prisma/client/runtime/library").Decimal;
        gstNumber: string;
        phone: string;
        panNumber: string | null;
        stripeCustomerId: string | null;
        ownerId: string;
        isVerified: boolean;
        bankDetails: import("@prisma/client/runtime/library").JsonValue | null;
        bannerUrl: string | null;
        logoUrl: string | null;
        reviewCount: number;
        socialLinks: import("@prisma/client/runtime/library").JsonValue | null;
        websiteUrl: string | null;
        businessType: string;
        legalName: string | null;
        kycStatus: import(".prisma/client").$Enums.SellerKycStatus;
        kycSubmittedAt: Date | null;
        kycVerifiedAt: Date | null;
        kycRejectedAt: Date | null;
        kycRemarks: string | null;
        sellerAgreementAccepted: boolean;
        sellerAgreementVersion: string | null;
        sellerAgreementAcceptedAt: Date | null;
        isPayoutEnabled: boolean;
        kycDocumentsJson: import("@prisma/client/runtime/library").JsonValue | null;
        plan: import(".prisma/client").$Enums.SubscriptionPlan;
        subscriptionExpiresAt: Date | null;
    }>;
}
export {};
