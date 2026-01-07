import { Controller, Post, Delete, Param, UseGuards, Req, BadRequestException, ValidationPipe } from '@nestjs/common';
import { GenericImageService, UploadedFile } from './generic-image.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { MultipartFile } from 'fastify-multipart';
import { AddGenericImagesDto } from './dto/create-generic-image.dto';

@ApiTags('Admin - Generic Images')
@Controller('admin/generic-images')
@Roles('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class GenericImageController {
  constructor(
    private readonly genericImageService: GenericImageService,
    private readonly validationPipe: ValidationPipe,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Add one or more images for a category/subcategory' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['categoryOrSubcategoryId', 'type'],
      properties: {
        categoryOrSubcategoryId: { type: 'string', format: 'uuid' },
        type: { type: 'string', enum: ['category', 'subcategory'] },
        imageUrls: { 
          type: 'string', 
          description: 'A JSON string array of web URLs. Provide this OR imageFiles.', 
          example: '["https://example.com/img1.png"]' 
        },
        imageFiles: { 
          type: 'array', 
          items: { type: 'string', format: 'binary' },
          description: 'One or more image files to upload. Provide this OR imageUrls.'
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Images added successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request. Missing or invalid data.' })
  async addImages(@Req() req: FastifyRequest) {
    const { rawDto, files } = await this.parseMultipartRequest(req);

    const dto = await this.validationPipe.transform(rawDto, {
      type: 'body',
      metatype: AddGenericImagesDto,
    });

    return this.genericImageService.addImages(dto, files);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a generic image by its own ID' })
  @ApiResponse({ status: 200, description: 'Image deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Image not found.' })
  deleteImage(@Param('id') id: string) {
    return this.genericImageService.deleteImage(id);
  }

  // UPDATED to handle multiple files
  private async parseMultipartRequest(req: FastifyRequest): Promise<{ rawDto: any; files?: UploadedFile[] }> {
    if (!req.isMultipart()) {
      throw new BadRequestException('Request is not multipart/form-data.');
    }

    const rawDto: any = {};
    const files: UploadedFile[] = [];

    for await (const part of req.parts() as AsyncIterableIterator<MultipartFile>) {
      if (part.file && part.fieldname === 'imageFiles') { // Note: fieldname is now plural
        const buffer = await part.toBuffer();
        if (buffer.length > 0) {
          files.push({ buffer, filename: part.filename, mimetype: part.mimetype });
        }
      } else if ((part as any).value !== undefined && (part as any).value !== '') {
        rawDto[(part as any).fieldname] = (part as any).value;
      }
    }
    
    // Return empty array if no files were uploaded, not undefined.
    return { rawDto, files };
  }
}