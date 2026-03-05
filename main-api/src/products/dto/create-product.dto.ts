// src/products/dto/create-product.dto.ts
import { Type, Transform } from 'class-transformer';
import {
  IsArray, IsNotEmpty, IsNumberString, IsString, ValidateNested,
  IsOptional, IsBoolean, IsEnum, IsInt, IsUrl,
} from 'class-validator';

export enum ProductType { STANDARD = 'STANDARD', DIGITAL = 'DIGITAL', SERVICE = 'SERVICE' }
export enum StockMethod { FIFO = 'FIFO', FEFO = 'FEFO', MANUAL = 'MANUAL' }

// ── Attribute ──────────────────────────────────────────────────────────────
class CreateVariantAttributeDto {
  @IsNumberString()
  @IsNotEmpty()
  attributeOptionId: string; // ID of chosen AttributeOption
}

// ── Variant ────────────────────────────────────────────────────────────────
export class CreateVariantDto {
  // REQUIRED
  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsNumberString()
  @IsNotEmpty()
  price: string;

  @IsNumberString()
  @IsNotEmpty()
  stock: string;           // defaults to 0 if not provided by frontend

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantAttributeDto)
  attributes: CreateVariantAttributeDto[];

  // OPTIONAL — pricing extras
  @IsOptional() @IsNumberString() mrp?: string;
  @IsOptional() @IsNumberString() purchasePrice?: string;
  @IsOptional() @IsString()       purchasePriceType?: string;   // default 'FIXED'
  @IsOptional() @IsString()       sellingPriceType?: string;    // default 'FIXED'

  // OPTIONAL — tax / compliance
  @IsOptional() @IsString() hsnCode?: string;
  @IsOptional() @IsString() sacCode?: string;

  // OPTIONAL — dimensions / weight
  @IsOptional() @IsNumberString() weightInGrams?: string;
  @IsOptional() @IsNumberString() height?: string;
  @IsOptional() @IsNumberString() width?: string;
  @IsOptional() @IsNumberString() length?: string;
  @IsOptional() @IsString()       dimensionUnit?: string;       // default 'CM'

  // OPTIONAL — stock alerts
  @IsOptional() @IsNumberString() minStockCount?: string;
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isMinStockAlertEnabled?: boolean;                             // default false

  // OPTIONAL — batch / serial / expiry (advanced; off by default)
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isBatchingEnabled?: boolean;                                  // default false

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isExpiryTracked?: boolean;                                    // default false

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isSerialTracked?: boolean;                                    // default false

  @IsOptional() @IsInt()         expiryAlertDays?: number;
  @IsOptional() @IsEnum(StockMethod) stockDeductionMethod?: StockMethod; // default FIFO

  // OPTIONAL — variant identity
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isDefault?: boolean;

  @IsOptional() @IsString() description?: string;

  // OPTIONAL — images (file upload handled separately in multipart; these are direct URLs)
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  imageUrls?: string[];
}

// ── Product ────────────────────────────────────────────────────────────────
export class CreateProductDto {
  // REQUIRED
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumberString()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants: CreateVariantDto[];

  // OPTIONAL — product identity
  @IsOptional() @IsEnum(ProductType) productType?: ProductType;  // default STANDARD
  @IsOptional() @IsString()          brand?: string;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  // OPTIONAL — SEO
  @IsOptional() @IsString() metaTitle?: string;
  @IsOptional() @IsString() metaDescription?: string;

  // OPTIONAL — customization
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isCustomizable?: boolean;

  @IsOptional() @IsString() customizationConfig?: string; // JSON string

  // OPTIONAL — scheduling
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isFeatured?: boolean;

  @IsOptional() @IsString() publishDate?: string; // ISO date string

  // OPTIONAL — product-level direct image URLs (files handled via multipart)
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  imageUrls?: string[];
}
