// src/products/products.controller.ts
import { 
  Controller, 
  Post, 
  UseGuards, 
  Req, 
  Param, 
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Get,
  Query
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProductsService } from './products.service';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('add/:businessId')
  async addProduct(
    @Req() req: FastifyRequest,
    @Param('businessId') businessId: string,
  ) {
    const user = req.user as any;

    // Check if user owns the business
    const business = await this.productsService.findBusinessById(businessId);
    
    if (!business) {
      throw new NotFoundException('Business not found');
    }
    
    if (business.ownerId !== user.id) {
      throw new ForbiddenException('You do not have permission to add products to this business');
    }

    // --- FIX IS HERE ---
    // REMOVED: const data = await req.file(); 
    // REMOVED: console.log(data?.fields,'opopopop');

    // The request body has not been touched yet, so we can parse it now.
    const formData = await this.parseMultipartData(req);
    
    // Validate required fields
    this.validateProductData(formData);

    return this.productsService.createProduct(businessId, formData);
  }

  private async parseMultipartData(req: FastifyRequest) {
    // Check if the request is multipart
    if (!req.isMultipart()) {
      throw new BadRequestException('Request is not multipart');
    }
    
    const parts = req.parts();
    const formData: any = {};
    const images: Array<{ buffer: Buffer; filename: string; mimetype: string }> = [];

    for await (const part of parts) {
      if (part.type === 'file') {
        // Ensure you are only processing files from the 'images' field
        if (part.fieldname === 'images') {
          const buffer = await part.toBuffer();
          images.push({
            buffer,
            filename: part.filename,
            mimetype: part.mimetype,
          });
        }
      } else {
        // Handle form fields
        // Check for fields that are JSON strings and parse them
        if (part.fieldname === 'categories' || part.fieldname === 'variants') {
          try {
            formData[part.fieldname] = JSON.parse(part.value as string);
          } catch (e) {
            throw new BadRequestException(`Invalid JSON format for field: ${part.fieldname}`);
          }
        } else {
          formData[part.fieldname] = part.value;
        }
      }
    }

    formData.images = images;
    return formData;
  }
  private validateProductData(formData: any) {
    const requiredFields = ['title', 'description', 'price', 'itemCategory', 'itemType', 'mrp', 'discountAmount'];
    
    for (const field of requiredFields) {
      if (!formData[field]) {
        throw new BadRequestException(`${field} is required`);
      }
    }

    if (!formData.images || formData.images.length === 0) {
      throw new BadRequestException('At least one image is required');
    }

    // Validate numeric fields
    const numericFields = ['price', 'mrp', 'discountAmount'];
    for (const field of numericFields) {
      const value = parseFloat(formData[field]);
      if (isNaN(value) || value < 0) {
        throw new BadRequestException(`${field} must be a valid positive number`);
      }
      formData[field] = value;
    }

    // Validate itemType
    const validItemTypes = ['Goods', 'Services'];
    if (!validItemTypes.includes(formData.itemType)) {
      throw new BadRequestException('itemType must be either "Goods" or "Services"');
    }
  }


  @UseGuards(JwtAuthGuard)
  @Get('business/:businessId')
  async getProductsForBusiness(
    @Param('businessId') businessId: string,
    @Req() req: FastifyRequest,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
       const user = req.user as any;
    return this.productsService.getProductsByBusiness(businessId, paginationQuery,user.id);
  }

  // --- NEW ENDPOINT: GET A SINGLE PRODUCT BY ID FOR A BUSINESS ---
  @UseGuards(JwtAuthGuard)
  @Get('business/:businessId/:productId')
  async getProductById(
    @Req() req: FastifyRequest,
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
  ) {
    const user = req.user as any;
    console.log(user);
    
    return this.productsService.getProductByIdForBusiness(businessId, productId,user.id);
  }
}
