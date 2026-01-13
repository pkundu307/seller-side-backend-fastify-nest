import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumberString,
  IsString,
  ValidateNested,
  IsOptional,
  IsInt,
  IsUrl,
} from 'class-validator';

// This DTO now expects the ID of the chosen option
class CreateVariantAttributeDto {
  @IsNumberString()
  @IsNotEmpty()
  attributeOptionId: string;
}

// The Variant DTO - now supports image URLs
class CreateVariantDto {
  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsNumberString()
  @IsNotEmpty()
  price: string;

  @IsNumberString()
  @IsNotEmpty()
  stock: string;

  @IsOptional()
  @IsNumberString()
  mrp?: string;

  @IsOptional()
  @IsString()
  hsnCode?: string;

  // --- NEW: Variant-level image URLs ---
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true, message: 'Each image URL must be a valid URL' })
  imageUrls?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantAttributeDto)
  attributes: CreateVariantAttributeDto[];
}

// The main Product DTO - now supports product-level image URLs
export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumberString()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  // --- NEW: Product-level image URLs ---
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true, message: 'Each image URL must be a valid URL' })
  imageUrls?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants: CreateVariantDto[];
}
