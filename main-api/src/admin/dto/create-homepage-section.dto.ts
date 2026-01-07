import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SectionType } from '@prisma/client'; // Keep for the type
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsJSON, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CreateHomepageItemDto } from './create-homepage-item.dto';

export class CreateHomepageSectionDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ enum: SectionType })
  // --- FIX ---
  @IsEnum(['HERO_SLIDER', 'SCROLLABLE_ROW', 'GRID_2XN', 'GRID_3XN', 'GRID_SQUARE_COMPACT', 'SINGLE_BANNER', 'PRODUCT_CAROUSEL'])
  type: SectionType;

  @ApiPropertyOptional({ description: 'JSON string for custom styling' })
  @IsOptional()
  @IsJSON()
  styleConfig?: string;

  @ApiProperty({ type: () => [CreateHomepageItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateHomepageItemDto)
  items: CreateHomepageItemDto[];
}