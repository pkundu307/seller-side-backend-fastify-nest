// import { ApiPropertyOptional } from '@nestjs/swagger';
// import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CreateCategoryDto } from './create-category.dto'; // Assuming you have this

// Option A: If you have CreateCategoryDto, extend it:
export class UpdateCategoryDto extends CreateCategoryDto {}

// Option B: If you want to define it explicitly:
/*
export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Electronics' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 18, description: 'GST Percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  gstRate?: number;

  @ApiPropertyOptional({ example: 12, description: 'Parent Category ID' })
  @IsOptional()
  @IsNumber()
  parentId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  position?: number;
}
*/