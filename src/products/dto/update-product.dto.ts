import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

// DTO for updating a single variant's data
class UpdateVariantDto {
  @ApiProperty({ description: 'The unique ID of the variant to update.', example: '...'})
  @IsUUID()
  @IsNotEmpty()
  id: string; // The ID is required to know WHICH variant to update

  @ApiPropertyOptional({ example: 'NEW-SKU-123' })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiPropertyOptional({ example: 49.99 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;
  
  @ApiPropertyOptional({ example: 59.99 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  mrp?: number;

  @ApiPropertyOptional({ example: 150 })
  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  // Note: Handling image updates (uploads/deletions) in a PATCH request is complex.
  // It's often better to have separate endpoints like POST /variants/:variantId/images.
  // We will focus on the data fields for this DTO.
}

// Main DTO for the entire update request
export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'My Updated Product Title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'An updated, more detailed description.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @ApiPropertyOptional({ type: [UpdateVariantDto], description: 'An array of variants with their updated data.' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateVariantDto)
  @IsOptional()
  variants?: UpdateVariantDto[];
}