import { Controller, Post, Get, Param, Body, UseGuards, Req, BadRequestException, ValidationPipe } from '@nestjs/common';
import { PredefinedAssetsService, UploadedFile } from './predefined-assets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { MultipartFile } from 'fastify-multipart';
import { CreateCategoriesDto } from './dto/create-categories.dto';
import { CreateSubCategoriesDto } from './dto/create-subcategories.dto';
import { AddSubCategoryImagesDto } from './dto/add-subcategory-images.dto';

@ApiTags('user - Predefined Customization Assets')
@Controller('user/predefined-assets')

@ApiBearerAuth()
export class UserPredefinedAssetsController {
  constructor(
    private readonly assetsService: PredefinedAssetsService,
    private readonly validationPipe: ValidationPipe,
  ) {}

//   @Post('categories')
//   @ApiOperation({ summary: 'Create one or more new categories' })
//   createCategories(@Body() dto: CreateCategoriesDto) {
//     return this.assetsService.createCategories(dto);
//   }

  @Get('categories')
  @ApiOperation({ summary: 'Get all predefined categories' })
  getAllCategories() {
    return this.assetsService.getAllCategories();
  }

//   @Post('subcategories')
//   @ApiOperation({ summary: 'Create one or more new subcategories under a parent category' })
//   createSubCategories(@Body() dto: CreateSubCategoriesDto) {
//     return this.assetsService.createSubCategories(dto);
//   }

  @Get('categories/:categoryId/subcategories')
  @ApiOperation({ summary: 'Get all subcategories for a specific category' })
  getSubCategoriesByCategoryId(@Param('categoryId') categoryId: string) {
    return this.assetsService.getSubCategoriesByCategoryId(categoryId);
  }

//   @Post('subcategory-images')
//   @ApiOperation({ summary: 'Add multiple images to a subcategory' })
//   @ApiConsumes('multipart/form-data')
//   @ApiBody({ type: AddSubCategoryImagesDto }) // Simplified for better Swagger UI
//   async addImagesToSubCategory(@Req() req: FastifyRequest) {
//     const { rawDto, files } = await this.parseMultipartRequest(req);
//     const dto = await this.validationPipe.transform(rawDto, {
//       type: 'body',
//       metatype: AddSubCategoryImagesDto,
//     });
//     return this.assetsService.addImagesToSubCategory(dto, files);
//   }

  @Get('subcategories/:subCategoryId/images')
  @ApiOperation({ summary: 'Get all images for a specific subcategory' })
  getImagesBySubCategoryId(@Param('subCategoryId') subCategoryId: string) {
    return this.assetsService.getImagesBySubCategoryId(subCategoryId);
  }

  private async parseMultipartRequest(req: FastifyRequest): Promise<{ rawDto: any; files?: UploadedFile[] }> {
    if (!req.isMultipart()) throw new BadRequestException('Request is not multipart/form-data.');
    
    const rawDto: any = {};
    const files: UploadedFile[] = [];

    for await (const part of req.parts() as AsyncIterableIterator<MultipartFile>) {
      if (part.file && part.fieldname === 'imageFiles') {
        const buffer = await part.toBuffer();
        if (buffer.length > 0) {
          files.push({ buffer, filename: part.filename, mimetype: part.mimetype });
        }
      } else if ((part as any).value !== undefined && (part as any).value !== '') {
        rawDto[(part as any).fieldname] = (part as any).value;
      }
    }
    return { rawDto, files };
  }
}