import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MultipartFile } from 'fastify-multipart';
import { CreateBannerDto } from './dto/create-banner.dto';
import { S3Service } from '../products/utils/s3Service';
import { UpdateBusinessVerificationDto } from './dto/update-business-verification.dto';
interface ParsedBannerFiles {
  bannerImage?: { buffer: Buffer; filename: string; mimetype: string };
  brandLogo?: { buffer: Buffer; filename: string; mimetype: string };
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
}