import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateDiscountDto {
  @ApiProperty({ example: 'Summer Sale 20%' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: DiscountType })
  @IsEnum(DiscountType)
  discountType: DiscountType;

  @ApiProperty({ example: 20 })
  @IsNumber()
  @Min(0)
  discountValue: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  minOrderAmount?: number;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @IsNumber()
  maxDiscountAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  endDate?: Date;
}
