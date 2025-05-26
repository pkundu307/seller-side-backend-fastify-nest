import {
  Controller,
  Post,
  UseGuards,
  Req,
  Body,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProductsService } from './products.service';
import { S3Service } from './util/S3Service';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly s3Service: S3Service,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  @ApiConsumes('multipart/form-data')
  async create(@Req() req: any) {
    const user = req.user;
    if (user.role !== 'seller') {
      throw new ForbiddenException('Only sellers can upload products');
    }

    const parts = req.parts(); // fastify-multipart

    const body: any = {};
    const images: string[] = [];

    for await (const part of parts) {
      if (part.file) {
        // Upload image to S3
        const url = await this.s3Service.uploadImage(await part.toBuffer(), part.filename, part.mimetype);
        images.push(url);
      } else {
        // Non-file field
        if (part.fieldname === 'categories' || part.fieldname === 'variants') {
          body[part.fieldname] = JSON.parse(part.value);
        } else {
          body[part.fieldname] = part.value;
        }
      }
    }

    body.images = images;

    return this.productsService.create(body);
  }
  
}
