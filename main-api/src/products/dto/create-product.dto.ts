import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumberString,
  IsString,
  ValidateNested,
  IsOptional,
  IsInt,
} from 'class-validator';

// This DTO now expects the ID of the chosen option
class CreateVariantAttributeDto {
  @IsNumberString()
  @IsNotEmpty()
  attributeOptionId: string;
}

// The Variant DTO remains largely the same, but its nested attribute DTO changes
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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantAttributeDto)
  attributes: CreateVariantAttributeDto[];
}

// The main Product DTO
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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants: CreateVariantDto[];
}