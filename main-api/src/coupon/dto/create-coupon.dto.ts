import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCouponDto {
  @ApiProperty({ example: 'SAVE20' })
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  discountId: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  maxUses?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  perUserLimit?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  firstOrderOnly?: boolean;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @IsNumber()
  maxOrderAmount?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  minItemQuantity?: number;

  @ApiPropertyOptional({ example: 'ONLINE', enum: ['ONLINE', 'POS', 'APP', 'ALL'] })
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  startsAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  expiresAt?: Date;
}
