import { IsArray, IsNumber, IsObject, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class BusinessProductDto {
  @IsString()
  id: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  slug: string;

  @IsString()
  businessName: string;

  @IsNumber()
  numberOfReviews: number;

  @IsString()
  price: string;

  @IsString()
  mrp: string;

  @IsArray()
  images: string[];

  @IsString()
  isCustomizable: string;
}

export class PaginationDto {
  @IsNumber()
  total: number;

  @IsNumber()
  page: number;

  @IsNumber()
  limit: number;

  @IsNumber()
  lastPage: number;
}

export class BusinessProductsResponseDto {
  @IsArray()
  products: BusinessProductDto[];

  @IsObject()
  pagination: PaginationDto;
}
