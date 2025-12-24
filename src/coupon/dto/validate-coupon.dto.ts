import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class ValidateCouponDto {
  @ApiProperty({ description: 'The coupon code to validate', example: 'WELCOME10' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value.toUpperCase())
  code: string;
  
  @ApiProperty({ description: 'The current subtotal of the cart to check against minOrderAmount' })
  @IsNumber()
  @IsNotEmpty()
  subtotal: number;
}