import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsDate, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateCouponDto {
  @ApiProperty({ description: 'The unique code for the coupon (e.g., WELCOME10)', example: 'SUMMER25' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value.toUpperCase()) // Automatically convert code to uppercase
  code: string;

  @ApiProperty({ description: 'The ID of the discount rules this coupon is linked to' })
  @IsString()
  @IsNotEmpty()
  discountId: string;

  @ApiPropertyOptional({ description: 'Is the coupon currently active?', default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'The maximum number of times this coupon can be used in total' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @ApiPropertyOptional({ description: 'The maximum number of times a single user can use this coupon' })
  @IsOptional()
  @IsInt()
  @Min(1)
  perUserLimit?: number;

  @ApiPropertyOptional({ description: 'The date and time when the coupon becomes valid (ISO 8601 format)' })
  @IsOptional()
  @IsDate()
  @Transform(({ value }) => value && new Date(value))
  startsAt?: Date;

  @ApiPropertyOptional({ description: 'The date and time when the coupon expires (ISO 8601 format)' })
  @IsOptional()
  @IsDate()
  @Transform(({ value }) => value && new Date(value))
  expiresAt?: Date;
}