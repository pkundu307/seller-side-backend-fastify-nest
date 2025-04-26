import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  @ApiOperation({ summary: 'Add a new product (seller only)' })
  async create(@Request() req, @Body() body: CreateProductDto) {
    const user = req.user;
    console.log(req.user);
    if (user.role !== 'seller') {
      throw new ForbiddenException('Only sellers can upload products');
    }

    return this.productsService.create(body, user.id);
  }
}
