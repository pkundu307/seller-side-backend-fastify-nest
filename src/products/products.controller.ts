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
  Body, // Import Body
  UsePipes, // Import UsePipes
  ValidationPipe,
  Patch, // Import ValidationPipe
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProductsService } from './products.service';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { CreateProductDto } from './dto/create-product.dto'; // <-- IMPORT THE DTO
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UpdateProductDto } from './dto/update-product.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('add/:businessId')
  // We don't need a special pipe for the DTO here because of multipart complexity.
  // We will manually validate after parsing.
  async addProduct(
    @Req() req: FastifyRequest,
    @Param('businessId') businessId: string,
  ) {
    const user = req.user as any;

    const business = await this.productsService.findBusinessById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }
    if (business.ownerId !== user.id) {
      throw new ForbiddenException(
        'You do not have permission for this business',
      );
    }

    // This parser is still necessary for multipart forms
    const formData = await this.parseMultipartData(req);

    // Manually validate the data against our new requirements
    this.validateProductData(formData);

    return this.productsService.createProduct(businessId, formData);
  }

  // REFINED: This parser is now simpler and more robust.
  private async parseMultipartData(req: FastifyRequest): Promise<any> {
    if (!req.isMultipart()) {
      throw new BadRequestException('Request is not multipart/form-data.');
    }

    const formData: any = { variants: [] };
    const productImages: Array<{
      buffer: Buffer;
      filename: string;
      mimetype: string;
    }> = [];
    // Changed: Create a map to store variant images by variant index/SKU
    const variantImagesMap = new Map<
      string,
      Array<{ buffer: Buffer; filename: string; mimetype: string }>
    >();

    for await (const part of req.parts()) {
      if (part.type === 'file') {
        if (part.fieldname === 'images') {
          // Main product images
          const buffer = await part.toBuffer();
          productImages.push({
            buffer,
            filename: part.filename,
            mimetype: part.mimetype,
          });
        } else if (part.fieldname.startsWith('variantImages_')) {
          // Extract variant identifier from fieldname (e.g., "variantImages_0", "variantImages_TSHIRT-RED-M")
          const variantId = part.fieldname.replace('variantImages_', '');
          const buffer = await part.toBuffer();

          if (!variantImagesMap.has(variantId)) {
            variantImagesMap.set(variantId, []);
          }
          variantImagesMap.get(variantId)!.push({
            buffer,
            filename: part.filename,
            mimetype: part.mimetype,
          });
        }
      } else if (part.type === 'field') {
        if (part.fieldname === 'variants') {
          try {
            formData.variants = JSON.parse(part.value as string);
          } catch (e) {
            throw new BadRequestException(
              'Invalid JSON format for the "variants" field.',
            );
          }
        } else {
          formData[part.fieldname] = part.value;
        }
      }
    }

    formData.images = productImages;
    formData.variantImagesMap = variantImagesMap;
    return formData;
  }

  // REWRITTEN: This validation logic now matches the new schema.
  private validateProductData(formData: any): void {
    const { title, categoryId, variants, images } = formData;
    if (!title) throw new BadRequestException('Product title is required.');
    if (!categoryId || isNaN(parseInt(categoryId, 10)))
      throw new BadRequestException('A valid categoryId is required.');
    if (!images || images.length === 0)
      throw new BadRequestException('At least one product image is required.');
    if (!Array.isArray(variants) || variants.length === 0)
      throw new BadRequestException('At least one variant is required.');

    // Updated validation for the new attribute structure
    for (const variant of variants) {
      if (!variant.sku)
        throw new BadRequestException('Each variant must have a SKU.');
      if (!variant.price || isNaN(parseFloat(variant.price)))
        throw new BadRequestException(
          `Variant with SKU ${variant.sku} must have a valid price.`,
        );
      if (!variant.stock || isNaN(parseInt(variant.stock, 10)))
        throw new BadRequestException(
          `Variant with SKU ${variant.sku} must have a valid stock count.`,
        );

      // Check if attributes exist and that they have the correct property
      if (
        !Array.isArray(variant.attributes) ||
        variant.attributes.length === 0
      ) {
        throw new BadRequestException(
          `Variant with SKU ${variant.sku} must have at least one attribute.`,
        );
      }
      for (const attr of variant.attributes) {
        if (
          !attr.attributeOptionId ||
          isNaN(parseInt(attr.attributeOptionId, 10))
        ) {
          throw new BadRequestException(
            `Each attribute for a variant must have a valid attributeOptionId.`,
          );
        }
      }
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('business/:businessId')
  // Use a pipe to automatically validate and transform query parameters
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
  @Patch(':productId') // Simplified route, businessId can be inferred
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product and its variants' })
  // ... ApiResponse decorators
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
    // console.log(productId,user);
    

    // 1. Parse all multipart data (files and fields)
    const formData = await this.parseMultipartUpdateData(req);

    // 2. Manually validate the parsed DTO
    const validationErrors = await validate(formData.dto);
    if (validationErrors.length > 0) {
      throw new BadRequestException(validationErrors);
    }

    // 3. Call the service with the validated DTO and file data
    return this.productsService.updateProduct(
      productId,
      user.id,
      formData.dto,
      formData.newProductImages,
      formData.newVariantImagesMap,
    );
  }

  private async parseMultipartUpdateData(req: FastifyRequest): Promise<{
    dto: UpdateProductDto;
    newProductImages: any[];
    newVariantImagesMap: Map<string, any[]>;
    }> {
    const fields: any = {};
    const newProductImages: any[] = [];
    const newVariantImagesMap = new Map<string, any[]>();

    for await (const part of req.parts()) {
      if (part.type === 'file') {
        const buffer = await part.toBuffer();
        const fileData = {
          buffer,
          filename: part.filename,
          mimetype: part.mimetype,
        };

        if (part.fieldname === 'images') {
          newProductImages.push(fileData);
        } else if (part.fieldname.startsWith('variantImages_')) {
          const variantIndex = part.fieldname.replace('variantImages_', '');
          if (!newVariantImagesMap.has(variantIndex)) {
            newVariantImagesMap.set(variantIndex, []);
          }
          newVariantImagesMap.get(variantIndex)!.push(fileData);
        }
      } else {
        // field
        fields[part.fieldname] = part.value;
      }
    }

    // Reconstruct the DTO from parsed fields
    const dtoData: any = {
      title: fields.title,
      description: fields.description,
      isFeatured: fields.isFeatured === 'true',
      isCustomizable: fields.isCustomizable === 'true',
      variants: fields.variants ? JSON.parse(fields.variants) : [],
      imagesToDelete: fields.imagesToDelete
        ? JSON.parse(fields.imagesToDelete)
        : [],
    };

    // Use class-transformer to create an instance of our DTO
    const dto = plainToInstance(UpdateProductDto, dtoData);

    return { dto, newProductImages, newVariantImagesMap };
  }
}
