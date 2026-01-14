// src/products/product-search.controller.ts

import { Controller, Get, Param, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ProductSearchService } from './product-search.service';
import { SearchProductsDto } from './dto/search-products.dto';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProductSlugDto } from './dto/product-slug.dto';

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

    @Get(':slug') // <-- THIS IS THE NEW ENDPOINT
  @ApiOperation({ summary: 'Get a single product by its unique slug' })
  @ApiResponse({ status: 200, description: 'Returns the full product details.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async getProductBySlug(@Param() params: ProductSlugDto) {
    return this.productSearchService.findProductBySlug(params.slug);
  }
}