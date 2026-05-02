import { Type, Transform } from 'class-transformer';
import {
  IsString, IsOptional, IsBoolean, IsArray, ValidateNested,
  IsInt, IsNotEmpty, IsNumber, IsEnum, IsUrl, Min,
} from 'class-validator';
import { StockMethod } from './create-product.dto';

// ── Attribute ─────────────────────────────────────────────────────────────────
class UpdateVariantAttributeDto {
  @IsInt()
  attributeId: number;

  @IsInt()
  attributeOptionId: number;
}

// ── Variant ───────────────────────────────────────────────────────────────────
export class UpdateVariantDto {

  // ── Optional: only present when updating an existing variant ──────────────
  @IsOptional() @IsString() id?: string;

  // ── Required: identity & pricing ──────────────────────────────────────────
  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsNumber()
  price: number;

  @IsNumber()
  stock: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateVariantAttributeDto)
  attributeValues: UpdateVariantAttributeDto[];

  // ── Required: physical / shipping ──────────────────────────────────────────
  @IsNumber()
  @Min(1, { message: 'weightInGrams must be a positive number.' })
  weightInGrams: number;

  @IsNumber()
  @Min(1, { message: 'length must be a positive number.' })
  length: number;

  @IsNumber()
  @Min(1, { message: 'width must be a positive number.' })
  width: number;

  @IsNumber()
  @Min(1, { message: 'height must be a positive number.' })
  height: number;

  // ── Optional: pricing extras ───────────────────────────────────────────────
  @IsOptional() @IsNumber() mrp?: number;
  @IsOptional() @IsNumber() purchasePrice?: number;
  @IsOptional() @IsString() purchasePriceType?: string;

  // ── Optional: tax / compliance ─────────────────────────────────────────────
  @IsOptional() @IsString() hsnCode?: string;
  @IsOptional() @IsString() sacCode?: string;
    @IsOptional() @IsString() tax?: string; 

  // ── Optional: dimension unit ───────────────────────────────────────────────
  @IsOptional() @IsString() dimensionUnit?: string;           // default 'CM'

  // ── Optional: stock alerts ─────────────────────────────────────────────────
  @IsOptional() @IsNumber() minStockCount?: number;
  @IsOptional() @IsBoolean() isMinStockAlertEnabled?: boolean;

  // ── Optional: batch / serial / expiry ──────────────────────────────────────
  @IsOptional() @IsBoolean() isBatchingEnabled?: boolean;
  @IsOptional() @IsBoolean() isExpiryTracked?: boolean;
  @IsOptional() @IsInt()     @Min(1) expiryAlertDays?: number;
  @IsOptional() @IsBoolean() isSerialTracked?: boolean;
  @IsOptional() @IsEnum(StockMethod) stockDeductionMethod?: StockMethod;

  // ── Optional: variant identity ─────────────────────────────────────────────
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsString()  status?: string;
  @IsOptional() @IsString()  description?: string;

  // ── Optional: images ───────────────────────────────────────────────────────
  @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  newImageUrls?: string[];
}

// ── Product ───────────────────────────────────────────────────────────────────
export class UpdateProductDto {

  // ── Optional: product identity ─────────────────────────────────────────────
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() brand?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  // ── Optional: SEO ──────────────────────────────────────────────────────────
  @IsOptional() @IsString() metaTitle?: string;
  @IsOptional() @IsString() metaDescription?: string;

  // ── Optional: customization ────────────────────────────────────────────────
  @IsOptional() @IsBoolean() isCustomizable?: boolean;
  @IsOptional() @IsString()  customizationConfig?: string;   // JSON string

  // ── Optional: scheduling / publishing ──────────────────────────────────────
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsBoolean() isPublished?: boolean;          // admin-only in service
  @IsOptional() @IsString()  publishDate?: string;           // ISO date string

  // ── Optional: image management ─────────────────────────────────────────────
  @IsOptional() @IsArray() @IsUrl({}, { each: true }) imagesToDelete?: string[];
  @IsOptional() @IsArray() @IsUrl({}, { each: true }) newProductImageUrls?: string[];

  // ── Optional: file asset deletion flags ────────────────────────────────────
  @IsOptional() @IsBoolean() deleteModel3d?: boolean;
  @IsOptional() @IsBoolean() deleteSlicenseDocument?: boolean;

  // ── Required: variants (always send full variant list) ─────────────────────
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateVariantDto)
  variants: UpdateVariantDto[];
}
