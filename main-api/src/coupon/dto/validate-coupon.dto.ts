import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';

class CartItemDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  categoryId?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brand?: string | null;
}

export class ValidateCouponDto {
  @ApiProperty({ example: 'WELCOME10' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value.toUpperCase())
  code: string;

  @ApiProperty({ example: 1500 })
  @IsNumber()
  @IsNotEmpty()
  subtotal: number;

  @ApiPropertyOptional({ type: [CartItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  cartItems?: CartItemDto[];
}
