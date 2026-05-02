import { Type, Transform } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumberString,
  IsString,
  ValidateNested,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsInt,
  IsUrl,
  Min,
  IsPositive,
} from 'class-validator';

export enum ProductType {
  STANDARD = 'STANDARD',
  DIGITAL = 'DIGITAL',
  SERVICE = 'SERVICE',
}
export enum StockMethod {
  FIFO = 'FIFO',
  FEFO = 'FEFO',
  MANUAL = 'MANUAL',
}

// ── Attribute ─────────────────────────────────────────────────────────────────
class CreateVariantAttributeDto {
  @IsNumberString()
  @IsNotEmpty()
  attributeOptionId: string;
}

// ── Variant ───────────────────────────────────────────────────────────────────
export class CreateVariantDto {
  // ── Required: identity & pricing ──────────────────────────────────────────
  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsOptional() @IsString() tax?: string;

  @IsNumberString()
  @IsNotEmpty()
  price: string;

  @IsNumberString()
  @IsNotEmpty()
  stock: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantAttributeDto)
  attributes: CreateVariantAttributeDto[];

  // ── Required: physical / shipping ──────────────────────────────────────────
  // These come from mandatory dropdowns on the frontend.
  // Values are numeric strings representing the upper bound of the selected range.
  @IsNumberString()
  @IsNotEmpty({
    message: 'Approx weight is required for shipping calculation.',
  })
  weightInGrams: string; // e.g. "1000"  → 1 kg bucket

  @IsNumberString()
  @IsNotEmpty({
    message: 'Length is required for volumetric weight calculation.',
  })
  length: string; // e.g. "25" cm

  @IsNumberString()
  @IsNotEmpty({
    message: 'Width is required for volumetric weight calculation.',
  })
  width: string; // e.g. "20" cm

  @IsNumberString()
  @IsNotEmpty({
    message: 'Height is required for volumetric weight calculation.',
  })
  height: string; // e.g. "10" cm

  // ── Optional: pricing extras ───────────────────────────────────────────────
  @IsOptional() @IsNumberString() mrp?: string;
  @IsOptional() @IsNumberString() purchasePrice?: string;
  @IsOptional() @IsString() purchasePriceType?: string;

  // ── Optional: tax / compliance ─────────────────────────────────────────────
  @IsOptional() @IsString() hsnCode?: string;
  @IsOptional() @IsString() sacCode?: string;

  // ── Optional: dimension unit ───────────────────────────────────────────────
  @IsOptional() @IsString() dimensionUnit?: string; // default 'CM'

  // ── Optional: stock alerts ─────────────────────────────────────────────────
  @IsOptional() @IsNumberString() minStockCount?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isMinStockAlertEnabled?: boolean;

  // ── Optional: batch / serial / expiry ──────────────────────────────────────
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isBatchingEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isExpiryTracked?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isSerialTracked?: boolean;

  @IsOptional() @IsInt() @Min(1) expiryAlertDays?: number;

  @IsOptional() @IsEnum(StockMethod) stockDeductionMethod?: StockMethod;

  // ── Optional: variant identity ─────────────────────────────────────────────
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isDefault?: boolean;

  @IsOptional() @IsString() description?: string;

  // ── Optional: images (files via multipart; these are direct URLs) ───────────
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  imageUrls?: string[];
}

// ── Product ───────────────────────────────────────────────────────────────────
export class CreateProductDto {
  // ── Required ──────────────────────────────────────────────────────────────
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

  // ── Optional: product identity ─────────────────────────────────────────────
  @IsOptional() @IsEnum(ProductType) productType?: ProductType;
  @IsOptional() @IsString() brand?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  // ── Optional: SEO ──────────────────────────────────────────────────────────
  @IsOptional() @IsString() metaTitle?: string;
  @IsOptional() @IsString() metaDescription?: string;

  // ── Optional: customization ────────────────────────────────────────────────
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isCustomizable?: boolean;

  @IsOptional() @IsString() customizationConfig?: string; // JSON string

  // ── Optional: scheduling ───────────────────────────────────────────────────
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isFeatured?: boolean;

  @IsOptional() @IsString() publishDate?: string; // ISO date string

  // ── Optional: product-level image URLs ────────────────────────────────────
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  imageUrls?: string[];
}
