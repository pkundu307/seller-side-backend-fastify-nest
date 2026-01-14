// src/product-search/dto/search-products.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchProductsDto {
  @ApiPropertyOptional({
    description: 'The search term for product titles, descriptions, etc.',
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
  @Type(() => Number) // Transform query param string to number
  @IsInt()
  categoryId?: number;

  // --- THIS IS THE KEY CHANGE ---
  @ApiPropertyOptional({
    description: 'Fetch a single, specific product by its unique slug.',
    example: 'red-cotton-t-shirt',
  })
  @IsOptional()
  @IsString()
  slug?: string; // Changed from productId
}