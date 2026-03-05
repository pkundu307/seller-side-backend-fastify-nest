// src/products/dto/update-product.dto.ts
import { Type, Transform } from 'class-transformer';
import {
  IsString, IsOptional, IsBoolean, IsArray, ValidateNested,
  IsInt, IsNotEmpty, IsNumber, IsUUID, IsJSON, IsEnum, IsUrl,
} from 'class-validator';
import { StockMethod } from './create-product.dto';

class UpdateVariantAttributeDto {
  @IsInt()
  attributeId: number;

  @IsInt()
  attributeOptionId: number;
}



// update-variant.dto.ts
export class UpdateVariantDto {
  @IsOptional() @IsString()  id?: string;
  @IsString()                sku: string;
  @IsNumber()                price: number;
  @IsNumber()                stock: number;
  @IsOptional() @IsNumber()  mrp?: number;
  @IsOptional() @IsNumber()  purchasePrice?: number;
  @IsOptional() @IsString()  hsnCode?: string;
  @IsOptional() @IsString()  sacCode?: string;
  @IsOptional() @IsString()  tax?: string;
  @IsOptional() @IsString()  description?: string;
  @IsOptional() @IsNumber()  weightInGrams?: number;
  @IsOptional() @IsNumber()  height?: number;
  @IsOptional() @IsNumber()  width?: number;
  @IsOptional() @IsNumber()  length?: number;
  @IsOptional() @IsString()  dimensionUnit?: string;
  @IsOptional() @IsNumber()  minStockCount?: number;
  @IsOptional() @IsBoolean() isMinStockAlertEnabled?: boolean;
  @IsOptional() @IsBoolean() isBatchingEnabled?: boolean;      // ✅
  @IsOptional() @IsBoolean() isExpiryTracked?: boolean;        // ✅
  @IsOptional() @IsNumber()  expiryAlertDays?: number;         // ✅
  @IsOptional() @IsBoolean() isSerialTracked?: boolean;        // ✅
  @IsOptional() @IsString()  stockDeductionMethod?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsString()  status?: string;
  @IsOptional() @IsArray()   images?: string[];
  @IsOptional() @IsArray()   newImageUrls?: string[];          // ✅ direct URL uploads
  @IsArray()                 attributeValues: { attributeId: number; attributeOptionId: number }[];
}

// update-product.dto.ts
export class UpdateProductDto {
  @IsOptional() @IsString()  title?: string;
  @IsOptional() @IsString()  description?: string;
  @IsOptional() @IsBoolean() isCustomizable?: boolean;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsBoolean() isPublished?: boolean;   // ignored for sellers in service
  @IsOptional() @IsString()  publishDate?: string;
  @IsOptional() @IsString()  brand?: string;
  @IsOptional() @IsArray()   tags?: string[];
  @IsOptional() @IsString()  metaTitle?: string;
  @IsOptional() @IsString()  metaDescription?: string;
  @IsOptional() @IsString()  customizationConfig?: string;
  @IsOptional() @IsArray()   imagesToDelete?: string[];
  @IsOptional() @IsArray()   newProductImageUrls?: string[];   // ✅ direct URL uploads
  @IsOptional() @IsBoolean() deleteModel3d?: boolean;
  @IsOptional() @IsBoolean() deleteSlicenseDocument?: boolean;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateVariantDto)
  variants: UpdateVariantDto[];
}
