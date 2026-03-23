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
  Query,
  Body,
  UsePipes,
  ValidationPipe,
  Patch,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify'; // Import MultipartFile for clarity
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProductsService } from './products.service';
import { CategoryPageQueryDto, PaginationQueryDto } from './dto/pagination-query.dto';
import { CreateProductDto } from './dto/create-product.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { UpdateProductDto, UpdateVariantDto } from './dto/update-product.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ProductPaginationDto } from './dto/product-pagination.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('add/:businessId')
  async addProduct(
    @Req() req: FastifyRequest,
    @Param('businessId') businessId: string,
  ) {
    try {
      const user = req.user as any;
      console.log('[CONTROLLER] User:', user);

      const business = await this.productsService.findBusinessById(businessId);
      if (!business) {
        throw new NotFoundException('Business not found');
      }

      if (business.ownerId !== user.id) {
        throw new ForbiddenException(
          'You do not have permission for this business',
        );
      }
      console.log('[CONTROLLER] Business check passed:', business.name);

      const formData = await this.parseMultipartData(req);
    
      console.log('[CONTROLLER] Running validation...');
      this.validateProductData(formData);
      console.log('[CONTROLLER] Validation passed.');

      console.log('[CONTROLLER] Calling productsService.createProduct...');
      const result = await this.productsService.createProduct(
        businessId,
        formData,
      );
      console.log('[CONTROLLER] productsService.createProduct SUCCEEDED.');
      return result;
    } catch (error) {
      console.error('[CONTROLLER] An error occurred in addProduct:', error);
      throw error;
    }
  }

  // --- ENHANCED PARSER: Supports BOTH file uploads AND URL arrays ---
  private async parseMultipartData(req: FastifyRequest): Promise<any> {
    if (!req.isMultipart()) {
      throw new BadRequestException('Request is not multipart/form-data.');
    }

    const formData: any = { variants: [] };
    const imageFiles: Array<{
      buffer: Buffer;
      filename: string;
      mimetype: string;
    }> = [];
    const variantImageFilesMap = new Map<
      string,
      Array<{ buffer: Buffer; filename: string; mimetype: string }>
    >();
    let productImageUrls: string[] = [];

    for await (const part of req.parts()) {
      if ('value' in part) {
        // It's a field
        try {
          if (part.fieldname === 'variants') {
            formData.variants = JSON.parse(part.value as string);
          } else if (part.fieldname === 'productImageUrls') {
            // <-- Match the frontend form data key
            productImageUrls = JSON.parse(part.value as string);
            if (!Array.isArray(productImageUrls))
              throw new Error('productImageUrls must be an array.');
          } else {
            formData[part.fieldname] = part.value;
          }
        } catch (e) {
          throw new BadRequestException(
            `Invalid JSON format for field "${part.fieldname}": ${e.message}`,
          );
        }
      } else {
        // It's a file
        const buffer = await part.toBuffer();
        if (part.fieldname === 'images') {
          imageFiles.push({
            buffer,
            filename: part.filename,
            mimetype: part.mimetype,
          });
        } else if (part.fieldname.startsWith('variantImages_')) {
          const identifier = part.fieldname.replace('variantImages_', '');
          if (!variantImageFilesMap.has(identifier)) {
            variantImageFilesMap.set(identifier, []);
          }
          variantImageFilesMap
            .get(identifier)!
            .push({ buffer, filename: part.filename, mimetype: part.mimetype });
        }
      }
    }

    // Attach all parsed data to the final object with consistent naming
    formData.imageFiles = imageFiles;
    formData.productImageUrls = productImageUrls;
    formData.variantImageFilesMap = variantImageFilesMap;
    return formData;
  }

  /**
   * Corrected validation logic.
   */
  private validateProductData(formData: any): void {
    const {
      title,
      categoryId,
      description,
      variants,
      imageFiles,
      productImageUrls,
    } = formData;

    // ── Hard requirements ──────────────────────────────────────────────────────
    if (!title?.trim())
      throw new BadRequestException('Product title is required.');

    if (!categoryId || isNaN(parseInt(categoryId, 10)))
      throw new BadRequestException('A valid categoryId is required.');

    if (!description?.trim())
      throw new BadRequestException('Product description is required.');

    if (!Array.isArray(variants) || variants.length === 0)
      throw new BadRequestException('At least one variant is required.');

    // ── Image requirement: product-level OR variant-level, file OR URL ─────────
    // At least one image must exist somewhere across the whole product
    const hasProductImageFiles = imageFiles?.length > 0;
    const hasProductImageUrls =
      Array.isArray(productImageUrls) && productImageUrls.length > 0;

    const hasAnyVariantImageFile = variants.some(
      (_, i) =>
        (formData.variantImageFilesMap.get(i.toString())?.length ?? 0) > 0 ||
        (formData.variantImageFilesMap.get(variants[i]?.sku)?.length ?? 0) > 0,
    );
    const hasAnyVariantImageUrl = variants.some(
      (v) => Array.isArray(v.imageUrls) && v.imageUrls.length > 0,
    );

    if (
      !hasProductImageFiles &&
      !hasProductImageUrls &&
      !hasAnyVariantImageFile &&
      !hasAnyVariantImageUrl
    ) {
      throw new BadRequestException(
        'At least one image is required — provide a product image file, a product image URL, or a variant image.',
      );
    }

    // ── Per-variant requirements ───────────────────────────────────────────────
    for (const [index, variant] of variants.entries()) {
      const label = variant.sku || `variant #${index + 1}`;

      if (!variant.sku?.trim())
        throw new BadRequestException(`SKU is required for ${label}.`);

      if (!variant.price || isNaN(parseFloat(variant.price)))
        throw new BadRequestException(
          `A valid price is required for variant "${label}".`,
        );

      if (
        variant.stock === undefined ||
        variant.stock === null ||
        isNaN(parseInt(variant.stock, 10))
      )
        throw new BadRequestException(
          `Stock is required for variant "${label}".`,
        );

      if (!Array.isArray(variant.attributes) || variant.attributes.length === 0)
        throw new BadRequestException(
          `At least one attribute is required for variant "${label}".`,
        );

      for (const attr of variant.attributes) {
        if (
          !attr.attributeOptionId ||
          isNaN(parseInt(attr.attributeOptionId, 10))
        ) {
          throw new BadRequestException(
            `Each attribute for variant "${label}" must have a valid attributeOptionId.`,
          );
        }
      }
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('business/:businessId')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getProductsForBusiness(
    @Param('businessId') businessId: string,
    @Req() req: FastifyRequest,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    const user = req.user as any;
    return this.productsService.getProductsByBusiness(
      businessId,
      paginationQuery,
      user.id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('business/:businessId/:productId')
  @ApiBearerAuth()
  async getProductById(
    @Req() req: FastifyRequest,
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
  ) {
    const user = req.user as any;
    return this.productsService.getProductByIdForBusiness(
      businessId,
      productId,
      user.id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':productId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product and its variants' })
  async updateProduct(
    @Param('productId') productId: string,
    @Req() req: FastifyRequest,
  ) {
    if (!req.isMultipart()) {
      throw new BadRequestException(
        'Request must be multipart/form-data for product updates.',
      );
    }

    const user = req.user as any;

    // Admins can set isPublished; sellers cannot
    const callerRole: 'admin' | 'seller' =
      user.role === 'admin' ? 'admin' : 'seller';

    const formData = await this.parseMultipartUpdateData(req);

    const validationErrors = await validate(formData.dto);
    if (validationErrors.length > 0) {
      throw new BadRequestException(validationErrors);
    }

    return this.productsService.updateProduct(
      productId,
      user.id,
      formData.dto,
      formData.newProductImages,
      formData.newVariantImagesMap,
      formData.newModel3dFile,
      formData.newSlicenseDocumentFile,
      callerRole,
    );
  }


  // --- REVISED & TYPE-SAFE PARSER ---
  // Applying the same `in` operator type guard for consistency and safety.



  private async parseMultipartUpdateData(req: FastifyRequest): Promise<{
    dto: UpdateProductDto;
    newProductImages: any[];
    newVariantImagesMap: Map<string, any[]>;
    newModel3dFile?: any;
    newSlicenseDocumentFile?: any;
  }> {
    const newProductImages: any[] = [];
    const newVariantImagesMap = new Map<string, any[]>();
    let newModel3dFile: any;
    let newSlicenseDocumentFile: any;
    const fields: Record<string, any> = {};

    const parts = req.parts();
    for await (const part of parts) {
      if ('value' in part) {
        // It's a field
        fields[part.fieldname] = part.value;
      } else {
        // It's a file
        const buffer = await part.toBuffer();
        const file = {
          buffer,
          filename: part.filename,
          mimetype: part.mimetype,
        };

        if (part.fieldname === 'images') {
          newProductImages.push(file);
        } else if (part.fieldname === 'model3d') {
          newModel3dFile = file;
        } else if (part.fieldname === 'slicenseDocument') {
          newSlicenseDocumentFile = file;
        } else if (part.fieldname.startsWith('variantImages_')) {
          const index = part.fieldname.replace('variantImages_', '');
          if (!newVariantImagesMap.has(index)) newVariantImagesMap.set(index, []);
          newVariantImagesMap.get(index)!.push(file);
        }
      }
    }

    // ── Parse variants JSON ────────────────────────────────────────────────
    let variants: UpdateVariantDto[] = [];
    if (fields['variants']) {
      try {
        const parsed = JSON.parse(fields['variants']);
        variants = parsed.map((v: any) => plainToInstance(UpdateVariantDto, v));
      } catch {
        throw new BadRequestException('Invalid variants JSON.');
      }
    }

    // ── Parse newProductImageUrls ──────────────────────────────────────────
    let newProductImageUrls: string[] = [];
    if (fields['newProductImageUrls']) {
      try {
        newProductImageUrls = JSON.parse(fields['newProductImageUrls']);
      } catch {
        newProductImageUrls = [];
      }
    }

    // ── Parse imagesToDelete ───────────────────────────────────────────────
    let imagesToDelete: string[] = [];
    if (fields['imagesToDelete']) {
      try {
        imagesToDelete = JSON.parse(fields['imagesToDelete']);
      } catch {
        imagesToDelete = [];
      }
    }

    // ── Parse tags ─────────────────────────────────────────────────────────
    let tags: string[] | undefined;
    if (fields['tags']) {
      try {
        tags = JSON.parse(fields['tags']);
      } catch {
        tags = undefined;
      }
    }

    // ── Build DTO ──────────────────────────────────────────────────────────
    const dto = plainToInstance(UpdateProductDto, {
      title:                  fields['title'],
      description:            fields['description'],
      isCustomizable:         fields['isCustomizable'] === 'true',
      isFeatured:             fields['isFeatured'] === 'true',
      // isPublished parsed but service ignores it for sellers
      isPublished:            fields['isPublished'] !== undefined
                                ? fields['isPublished'] === 'true'
                                : undefined,
      publishDate:            fields['publishDate'],
      brand:                  fields['brand'],
      tags,
      metaTitle:              fields['metaTitle'],
      metaDescription:        fields['metaDescription'],
      customizationConfig:    fields['customizationConfig'],
      imagesToDelete,
      newProductImageUrls,    // ✅ direct URL uploads for product
      deleteModel3d:          fields['deleteModel3d'] === 'true',
      deleteSlicenseDocument: fields['deleteSlicenseDocument'] === 'true',
      variants,
    });

    return {
      dto,
      newProductImages,
      newVariantImagesMap,
      newModel3dFile,
      newSlicenseDocumentFile,
    };
  }



  @UseGuards(JwtAuthGuard)
  @Get('stats/:businessId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get key inventory statistics for a business' })
  @ApiResponse({
    status: 200,
    description: 'Returns inventory dashboard statistics.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Business not found.' })
  async getDashboardStats(
    @Param('businessId') businessId: string,
    @Req() req: FastifyRequest,
  ) {
    const user = req.user as any;
    return this.productsService.getInventoryStats(businessId, user.id);
  }

  @Get('featured/category/:categoryId')
  @ApiOperation({
    summary:
      'Get all featured products by category with reduced details (Customer-facing)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of featured products with minimal details.',
  })
  @ApiResponse({ status: 400, description: 'Invalid category ID provided.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getFeaturedProductsByCategory(
    @Param('categoryId') categoryId: string,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    const id = parseInt(categoryId, 10);
    if (isNaN(id)) {
      throw new BadRequestException(
        'Invalid category ID provided. Must be a number.',
      );
    }
    return this.productsService.getFeaturedProductsByCategory(
      id,
      paginationQuery,
    );
  }

  @Get('public/:productId')
  @ApiOperation({
    summary: 'Customer: Get comprehensive details of a single product by ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns full details of a published product.',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found or not published.',
  })
  async getProductDetailsForCustomer(@Param('productId') productId: string) {
    return this.productsService.getProductDetailsForCustomer(productId);
  }

@Get('category-page/:slug')
@ApiOperation({ summary: 'Get category data with advanced filtering' })
async getCategoryPageData(
  @Param('slug') slug: string,
  @Query() query: CategoryPageQueryDto,
) {
  return this.productsService.getCategoryPageDataBySlug(slug, query);
}
  @Get('same/:slug')
getSimilarProducts(
  @Param('slug') slug: string,
  @Query('limit') limit?: string,
) {
  return this.productsService.getSimilarProducts(slug, limit ? parseInt(limit) : 8);
}
}
