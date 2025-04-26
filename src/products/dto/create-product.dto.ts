import {
    IsString,
    IsNumber,
    IsArray,
    IsBoolean,
    IsOptional,
    ValidateNested,
  } from 'class-validator';
  import { Type } from 'class-transformer';
  
  class VariantDto {
    @IsOptional()
    @IsString()
    size?: string;
  
    @IsOptional()
    @IsString()
    color?: string;
  
    @IsNumber()
    price: number;
  
    @IsNumber()
    stock: number;
  }
  
  export class CreateProductDto {
    @IsString()
    title: string;
  
    @IsString()
    description: string;
  
    @IsNumber()
    price: number;
  
    @IsArray()
    @IsString({ each: true })
    images: string[];
  
    @IsArray()
    @IsString({ each: true })
    categories: string[];
  
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => VariantDto)
    variants: VariantDto[];
  }
  