// src/products/dto/search-products.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class SearchProductsDto {
  @ApiPropertyOptional({
    description: 'The search term to look for in product titles, descriptions, SKUs, etc.',
    example: 'modern chair',
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: 'Filter results by a specific category ID.',
    example: '15',
  })
  @IsOptional()
  @IsString() // We receive it as a string from query params
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Fetch a single, specific product by its ID.',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  @IsOptional()
  @IsUUID()
  productId?: string;
}