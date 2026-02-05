import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UploadedFiles, UseGuards, UseInterceptors, ValidationPipe } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateBannerDto } from './dto/create-banner.dto';
import { MultipartFile } from 'fastify-multipart';

import { FastifyRequest } from 'fastify'
import { UpdateBusinessVerificationDto } from './dto/update-business-verification.dto';
import { CreateHomepageSectionDto } from './dto/create-homepage-section.dto';
import { AdminProductFilterDto, UpdateProductPublishStatusDto } from './dto/product-verification.dto';

interface ParsedHomepageFiles {
  itemImages: Map<number, { buffer: Buffer; filename: string; mimetype: string }>;
}


interface ParsedBannerFiles {
  bannerImage?: { buffer: Buffer; filename: string; mimetype: string };
  brandLogo?: { buffer: Buffer; filename: string; mimetype: string };
}


@ApiTags('Admin') // For Swagger documentation
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly validationPipe: ValidationPipe,
  ) {}

  @Get('dashboard-stats')
  @Roles('admin') // <-- Specify that ONLY the 'admin' role can access this
  @UseGuards(JwtAuthGuard, RolesGuard) // <-- Apply both guards
  @ApiBearerAuth() // For Swagger
  @ApiOperation({ summary: 'Get dashboard statistics for the admin panel' })
  @ApiResponse({ status: 200, description: 'Returns aggregate counts of key entities.' })
  @ApiResponse({ status: 403, description: 'Forbidden. User is not an admin.' })
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }
  



   @Get('featured-products')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all featured products grouped by category with business owner details' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns featured products organized by category with business owner company names.',
    schema: {
      type: 'object',
      properties: {
        categories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              categoryId: { type: 'number' },
              categoryName: { type: 'string' },
              categorySlug: { type: 'string' },
              products: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    slug: { type: 'string' },
                    images: { type: 'array', items: { type: 'string' } },
                    isPublished: { type: 'boolean' },
                    createdAt: { type: 'string' },
                    updatedAt: { type: 'string' },
                    business: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        city: { type: 'string' },
                        state: { type: 'string' },
                        isVerified: { type: 'boolean' },
                        owner: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            email: { type: 'string' }
                          }
                        }
                      }
                    },
                    variantCount: { type: 'number' },
                    defaultVariant: {
                      type: 'object',
                      properties: {
                        price: { type: 'number' },
                        stock: { type: 'number' },
                        status: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        totalFeaturedProducts: { type: 'number' }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Forbidden. User is not an admin.' })
  getFeaturedProducts() {
    return this.adminService.getFeaturedProducts();
  }

   @Post('banners')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  // REMOVED: @UseInterceptors decorator is gone
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new promotional banner' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    // This Swagger definition remains the same
    schema: {
      type: 'object',
      required: ['title', 'targetUrl', 'bannerImage'],
      properties: {
        title: { type: 'string' },
        discountText: { type: 'string' },
        targetUrl: { type: 'string', format: 'uri-relative' },
        position: { type: 'integer', default: 0 },
        bannerImage: { type: 'string', format: 'binary' },
        brandLogo: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Banner created successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request. Missing required fields or invalid data.' })
  @ApiResponse({ status: 403, description: 'Forbidden. User is not an admin.' })
  async createBanner(@Req() req: FastifyRequest) {
    // 1. Manually parse the multipart request
    const { rawDto, files } = await this.parseBannerMultipartData(req);

    // 2. Manually validate and transform the DTO part of the form
    const createBannerDto = await this.validationPipe.transform(rawDto, {
      type: 'body',
      metatype: CreateBannerDto,
    });
    
    // 3. Call the service with validated DTO and parsed files
    return this.adminService.createBanner(createBannerDto, files);
  }

  /**
   * Parses a multipart/form-data request for banner creation using Fastify's native parser.
   */
private async parseBannerMultipartData(
  req: FastifyRequest,
): Promise<{ rawDto: any; files: ParsedBannerFiles }> {
  if (!req.isMultipart()) {
    throw new BadRequestException('Request is not multipart/form-data.');
  }

  const rawDto: any = {};
  const files: ParsedBannerFiles = {};

  for await (const part of req.parts() as AsyncIterableIterator<MultipartFile>) {
    if (part.file) {
      // It's a file
      const buffer = await part.toBuffer();
      if (part.fieldname === 'bannerImage') {
        files.bannerImage = { buffer, filename: part.filename, mimetype: part.mimetype };
      } else if (part.fieldname === 'brandLogo') {
        files.brandLogo = { buffer, filename: part.filename, mimetype: part.mimetype };
      }
    } else if ((part as any).value) {
      // It's a field
      rawDto[(part as any).fieldname] = (part as any).value;
    }
  }

  return { rawDto, files };
}
 @Delete('banners/:id') // Route: DELETE /admin/banners/123
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a promotional banner by its ID' })
  @ApiResponse({ status: 200, description: 'Banner deleted successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden. User is not an admin.' })
  @ApiResponse({ status: 404, description: 'Not Found. Banner with the specified ID does not exist.' })
  deleteBanner(
    @Param('id', ParseIntPipe) id: number, // Extracts 'id' from URL and ensures it's a number
  ) {
    return this.adminService.deleteBanner(id);
  }


   @Get('businesses')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a list of all businesses registered on the platform' })
  @ApiResponse({
    status: 200,
    description: 'Returns an array of all businesses with owner details.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          phone: { type: 'string' },
          category: { type: 'string' },
          isVerified: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          owner: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              name: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden. User is not an admin.' })
  getAllBusinesses() {
    return this.adminService.getAllBusinesses();
  }

   @Patch('businesses/:businessId/verify')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the verification status of a business' })
  @ApiResponse({ status: 200, description: 'Business status updated successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request. isVerified must be a boolean.' })
  @ApiResponse({ status: 403, description: 'Forbidden. User is not an admin.' })
  @ApiResponse({ status: 404, description: 'Business not found.' })
  updateBusinessVerification(
    @Param('businessId') businessId: string,
    @Body() updateDto: UpdateBusinessVerificationDto,
  ) {
    return this.adminService.updateBusinessVerification(businessId, updateDto);
  }


  



  @Get('/products')
  @ApiOperation({ summary: 'List products for verification (Paginated)' })
  async listProducts(@Query() query: AdminProductFilterDto) {
    return this.adminService.getProductsForVerification(query);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get full product details for verification' })
  async getDetail(@Param('id') id: string) {
    return this.adminService.getProductDetailForAdmin(id);
  }

  @Patch('/products/:id/publish-status')
  @ApiOperation({ summary: 'Publish/Unpublish product and send remarks to seller' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateProductPublishStatusDto
  ) {
    return this.adminService.updateProductPublishStatus(id, dto);
  }
}