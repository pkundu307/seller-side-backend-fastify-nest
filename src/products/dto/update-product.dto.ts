import { Type } from 'class-transformer';
import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, IsInt, IsNotEmpty, IsNumber, IsUUID } from 'class-validator';

// DTO for individual attributes within a variant
class UpdateVariantAttributeDto {
  @IsInt()
  attributeId: number;

  @IsInt()
  attributeOptionId: number;
}

// DTO for a single variant
class UpdateVariantDto {
  @IsOptional()
  @IsUUID() // ID must be a UUID if it exists (for existing variants)
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
  
  // Existing images are just strings (URLs)
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

  // The 'variants' field will be a JSON string that we parse into this shape
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateVariantDto)
  variants: UpdateVariantDto[];

  // This will be a JSON string of URLs to delete
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imagesToDelete?: string[];
}