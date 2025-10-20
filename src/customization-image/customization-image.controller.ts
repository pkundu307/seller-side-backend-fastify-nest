import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req, BadRequestException, Query, ValidationPipe } from '@nestjs/common';
import { CustomizationImageService, UploadedFile } from './customization-image.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateCustomizationImageDto } from './dto/create-customization-image.dto';
import { UpdateCustomizationImageDto } from './dto/update-customization-image.dto';
import { FastifyRequest } from 'fastify';
import { MultipartFile } from 'fastify-multipart';

@ApiTags('Admin - Customization Images')
@Controller('admin/customization-images')
@Roles('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CustomizationImageController {
  constructor(
    private readonly customizationImageService: CustomizationImageService,
    private readonly validationPipe: ValidationPipe,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Add a new predefined image for customization' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['category', 'subCategory'],
      properties: {
        category: { type: 'string' },
        subCategory: { type: 'string' },
        url: { type: 'string', format: 'uri', description: 'Provide this OR imageFile' },
        imageFile: { type: 'string', format: 'binary', description: 'Provide this OR url' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Image added successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request. Invalid data provided.' })
  async create(@Req() req: FastifyRequest) {
    const { rawDto, file } = await this.parseMultipartRequest(req);

    const createDto = await this.validationPipe.transform(rawDto, {
      type: 'body',
      metatype: CreateCustomizationImageDto,
    });

    return this.customizationImageService.create(createDto, file);
  }

  @Patch(':id/active')
  @ApiOperation({ summary: 'Update the active state of a customization image' })
  @ApiResponse({ status: 200, description: 'Image state updated successfully.' })
  @ApiResponse({ status: 404, description: 'Image not found.' })
  updateActiveState(
    @Param('id') id: string,
    @Body() updateDto: UpdateCustomizationImageDto,
  ) {
    return this.customizationImageService.updateActiveState(id, updateDto.active);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a customization image' })
  @ApiResponse({ status: 200, description: 'Image deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Image not found.' })
  delete(@Param('id') id: string) {
    return this.customizationImageService.delete(id);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get a unique list of all image categories' })
  @ApiResponse({ status: 200, description: 'Returns a list of category names.' })
  getCategories() {
    return this.customizationImageService.getCategories();
  }

  @Get('categories/:category/subcategories')
  @ApiOperation({ summary: 'Get unique sub-categories for a specific category' })
  @ApiResponse({ status: 200, description: 'Returns a list of sub-category names.' })
  getSubCategories(@Param('category') category: string) {
    return this.customizationImageService.getSubCategories(category);
  }

  @Get('images-by-subcategory')
  @ApiOperation({ summary: 'Get all active images for a specific sub-category' })
  @ApiQuery({ name: 'category', type: String, required: true })
  @ApiQuery({ name: 'subCategory', type: String, required: true })
  @ApiResponse({ status: 200, description: 'Returns a list of image objects.' })
  getImagesBySubCategory(
    @Query('category') category: string,
    @Query('subCategory') subCategory: string,
  ) {
    if (!category || !subCategory) {
      throw new BadRequestException('Both category and subCategory query parameters are required.');
    }
    return this.customizationImageService.getImagesBySubCategory(category, subCategory);
  }

  /**
   * Helper to manually parse multipart form data using Fastify's parser.
   */
  private async parseMultipartRequest(req: FastifyRequest): Promise<{ rawDto: any; file?: UploadedFile }> {
    if (!req.isMultipart()) {
      throw new BadRequestException('Request is not multipart/form-data.');
    }

    const rawDto: any = {};
    let file: UploadedFile | undefined;

    for await (const part of req.parts() as AsyncIterableIterator<MultipartFile>) {
      if (part.file) {
        if (part.fieldname === 'imageFile') {
          const buffer = await part.toBuffer();
          // Only consider it a file if it has content
          if (buffer.length > 0) {
            file = {
              buffer: buffer,
              filename: part.filename,
              mimetype: part.mimetype,
            };
          }
        }
      } else if ((part as any).value !== undefined) {
        const value = (part as any).value;
        // --- THIS IS THE FIX ---
        // Only add the field to the DTO if its value is not an empty string.
        // This makes it 'undefined' for the validator, allowing @IsOptional to work correctly.
        if (value !== '') {
          rawDto[(part as any).fieldname] = value;
        }
      }
    }

    return { rawDto, file };
  }
}