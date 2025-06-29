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

  // ✅ New required fields
  @IsString()
  itemType: string;

  @IsString()
  itemCategory: string;

  @IsString()
  itemCode: string;

  @IsBoolean()
  isMrpEnabled: boolean;

  @IsBoolean()
  isWholesaleEnabled: boolean;

  @IsBoolean()
  isSerializationEnabled: boolean;

  @IsBoolean()
  isBatchingEnabled: boolean;

  @IsNumber()
  sellingPrice: number;

  @IsString()
  sellingPriceType: string;

  @IsNumber()
  purchasePrice: number;

  @IsString()
  purchasePriceType: string;

  @IsNumber()
  mrp: number;

  @IsNumber()
  wholesalePrice: number;

  @IsString()
  wholesalePriceType: string;

  @IsNumber()
  wholesaleQuantity: number;

  @IsNumber()
  discountPercent: number;

  @IsNumber()
  discountAmount: number;

  @IsString()
  hsnCode: string;

  @IsString()
  sacCode: string;

  @IsNumber()
  tax: number;

  @IsNumber()
  cess: number;

  @IsString()
  unit: string;

  @IsBoolean()
  isSecondUnitEnabled: boolean;

  @IsString()
  secondUnit: string;

  @IsNumber()
  conversionRate: number;

  @IsNumber()
  openingStock: number;

  @IsString() // will be casted to Date before DB call
  openingStockDate: string;

  @IsNumber()
  closingStock: number;
}
