import { ApiPropertyOptional } from '@nestjs/swagger';
import { LinkType } from '@prisma/client'; // Keep for the type
import { IsEnum, IsJSON, IsOptional, IsString } from 'class-validator';

export class UpdateHomepageItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional({ enum: LinkType })
  @IsOptional()
  // --- FIX ---
  @IsEnum(['NONE', 'CATEGORY', 'PRODUCT', 'BRAND', 'SEARCH', 'EXTERNAL_URL'])
  linkType?: LinkType;

  @ApiPropertyOptional({ description: 'A URL, slug, or ID depending on linkType' })
  @IsOptional()
  @IsString()
  linkValue?: string;

  @ApiPropertyOptional({ description: 'JSON string for custom styling' })
  @IsOptional()
  @IsJSON()
  styleConfig?: string;
  @ApiPropertyOptional({ description: 'Direct image URL (use instead of uploading a file)' })
@IsString()
@IsOptional()
imageUrl?: string;
}