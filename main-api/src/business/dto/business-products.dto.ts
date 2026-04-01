import { IsArray, IsNumber, IsObject, IsString } from 'class-validator';

export class ProductDto {
  @IsString()
  id: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  slug: string;

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

export class BusinessDto {
  @IsString()
  name: string;

  @IsString()
  state: string;

  @IsString()
  logo: string | null;
}

export class BusinessProductsResponseDto {
  @IsObject()
  business: BusinessDto;

  @IsArray()
  products: ProductDto[];

  @IsObject()
  pagination: PaginationDto;
}
