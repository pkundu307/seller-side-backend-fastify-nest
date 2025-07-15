import {
  IsArray, IsNumberString, IsOptional, IsString, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class VariantDto {
  @IsOptional() @IsString()   size!: string;
  @IsOptional() @IsString()   color!: string;
  @IsNumberString()           price!: string;
  @IsNumberString()           stock!: string;
}

export class CreateProductDto {
  @IsString()                 title!: string;
  @IsString()                 description!: string;
  @IsNumberString()           price!: string;
  @IsString()                 itemCategory!: string;
  @IsOptional() @IsString()   itemType?: string;
  @IsOptional() @IsNumberString() sellingPrice?: string;
  @IsOptional() @IsNumberString() mrp?: string;
  @IsOptional() @IsNumberString() discountPercent?: string;
  @IsOptional() @IsNumberString() discountAmount?: string;
  @IsOptional() @IsString()   unit?: string;
  @IsOptional() @IsNumberString() openingStock?: string;

  /** array of plain objects `{size, color, price, stock}` */
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  @IsArray()
  variants?: VariantDto[];
}
