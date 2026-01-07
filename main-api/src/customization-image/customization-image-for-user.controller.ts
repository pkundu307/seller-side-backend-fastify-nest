import { Controller,  Get, Param, BadRequestException, ValidationPipe } from '@nestjs/common';
import { PredefinedAssetsService, UploadedFile } from './predefined-assets.service';

import { ApiOperation,  ApiTags } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { MultipartFile } from 'fastify-multipart';


@ApiTags('user - Predefined Customization Assets')
@Controller('user/predefined-assets')



export class UserPredefinedAssetsController {
  constructor(
    private readonly assetsService: PredefinedAssetsService,
    private readonly validationPipe: ValidationPipe,
  ) {}



  @Get('categories')
  @ApiOperation({ summary: 'Get all predefined categories' })
  getAllCategories() {
    return this.assetsService.getAllCategories();
  }



  @Get('categories/:categoryId/subcategories')
  @ApiOperation({ summary: 'Get all subcategories for a specific category' })
  getSubCategoriesByCategoryId(@Param('categoryId') categoryId: string) {
    return this.assetsService.getSubCategoriesByCategoryId(categoryId);
  }



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