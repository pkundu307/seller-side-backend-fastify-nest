import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TargetType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateDiscountTargetDto {
  @ApiProperty({ enum: TargetType })
  @IsEnum(TargetType)
  targetType: TargetType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brand?: string;
}
