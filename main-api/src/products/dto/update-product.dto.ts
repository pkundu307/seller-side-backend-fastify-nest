// src/products/dto/update-product.dto.ts
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsUUID,
  IsJSON, // <-- Import IsJSON
} from 'class-validator';

// UpdateVariantAttributeDto and UpdateVariantDto remain unchanged...
class UpdateVariantAttributeDto {
  @IsInt()
  attributeId: number;

  @IsInt()
  attributeOptionId: number;
}
class UpdateVariantDto {
  @IsOptional()
  @IsUUID()
  id?: string;
  @IsString()
  @IsNotEmpty()
  sku: string;
  @IsNumber()
  price: number;
  @IsNumber()
  mrp: number;
  @IsInt()
  stock: number;
  @IsString()
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateVariantAttributeDto)
  attributeValues: UpdateVariantAttributeDto[];
  @IsArray()
  @IsString({ each: true })
  images: string[];
}

// Main DTO for the entire update payload
export class UpdateProductDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  isCustomizable?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateVariantDto)
  variants: UpdateVariantDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imagesToDelete?: string[];

  // --- NEW FIELDS ---

  @IsOptional()
  @IsJSON() // Validate that the string is valid JSON
  customizationConfig?: string;

  @IsOptional()
  @IsBoolean()
  deleteModel3d?: boolean;

  @IsOptional()
  @IsBoolean()
  deleteSlicenseDocument?: boolean;
}