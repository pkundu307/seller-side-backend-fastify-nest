import { IsNotEmpty, IsString } from 'class-validator';

export class ProductSlugDto {
  @IsString()
  @IsNotEmpty()
  slug: string;
}