import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SectionType } from '@prisma/client'; // Keep for the type
import { IsEnum, IsJSON, IsOptional, IsString } from 'class-validator';

export class CreateHomepageSectionDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ enum: SectionType })
  // --- FIX ---
  @IsEnum(['HERO_SLIDER', 'SCROLLABLE_ROW', 'GRID_2XN', 'GRID_3XN', 'GRID_SQUARE_COMPACT', 'SINGLE_BANNER', 'PRODUCT_CAROUSEL'])
  type: SectionType;
  
  @ApiPropertyOptional({ description: 'Optional subtitle for the section' })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional({ description: 'JSON string for custom styling' })
  @IsOptional()
  @IsJSON()
  styleConfig?: string;
}