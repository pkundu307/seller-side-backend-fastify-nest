import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ description: 'The name of the category', example: 'Electronics' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'The ID of the parent category. Leave empty for a top-level category.',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  parentId?: number;

  // --- GST RATE FIELD (as decimal number, not enum) ---
  @ApiProperty({
    description: 'The GST rate applicable to this category (as a percentage)',
    example: 18,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0, { message: 'GST rate must be at least 0' })
  @Max(100, { message: 'GST rate cannot exceed 100' })
  gstRate: number;

  // You can also add other new fields from your enhanced model here
  @ApiPropertyOptional({ description: 'A URL for the category image' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'A description for the category page (for SEO)' })
  @IsOptional()
  @IsString()
  description?: string;
}
