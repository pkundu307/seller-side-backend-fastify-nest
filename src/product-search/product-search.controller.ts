// src/products/product-search.controller.ts

import { Controller, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ProductSearchService } from './product-search.service';
import { SearchProductsDto } from './dto/search-products.dto';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Products')
@Controller('products/search')
export class ProductSearchController {
  constructor(private readonly productSearchService: ProductSearchService) {}

  @Get()
  @ApiOperation({
    summary: 'Search for products',
    description: 'Provides a flexible search for products by query, category, or product ID. Returns a maximum of 5 products, each with a maximum of 2 of its variants.',
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async searchProducts(@Query() searchDto: SearchProductsDto) {
    return this.productSearchService.searchProducts(searchDto);
  }
}