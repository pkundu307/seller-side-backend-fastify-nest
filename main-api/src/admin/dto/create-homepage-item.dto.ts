import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsJSON, IsOptional, IsString } from 'class-validator';
import { LinkType } from '@prisma/client'; // Keep for the type

export class CreateHomepageItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiProperty({ enum: LinkType, default: LinkType.NONE })
  // --- FIX ---
  @IsEnum(['NONE', 'CATEGORY', 'PRODUCT', 'BRAND', 'SEARCH', 'EXTERNAL_URL'])
  linkType: LinkType;

  @ApiPropertyOptional({ description: 'A URL, slug, or ID depending on linkType' })
  @IsOptional()
  @IsString()
  linkValue?: string;

  @ApiPropertyOptional({ description: 'JSON string for custom styling' })
  @IsOptional()
  @IsJSON()
  styleConfig?: string;

  @ApiPropertyOptional({ description: 'Order of item within the section', default: 0 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  position?: number;
}