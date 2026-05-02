// src/seller/dto/create-pos-sale.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray, IsEnum, IsIn, IsInt, IsNotEmpty,
  IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested,
} from 'class-validator';

export enum PosPaymentMode {
  CASH   = 'CASH',
  ONLINE = 'ONLINE',
  CHEQUE = 'CHEQUE',
}

// FIX: added discountValue + discountType
export class PosSaleItemDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  variantId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Discount value (percentage or fixed amount)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @ApiPropertyOptional({ enum: ['PERCENT', 'FIXED'], default: 'PERCENT' })
  @IsOptional()
  @IsIn(['PERCENT', 'FIXED'])
  discountType?: 'PERCENT' | 'FIXED';
}

export class AdditionalChargeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;
}

export class CreatePosSaleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  // FIX: added billingState for isInterState detection
  @ApiPropertyOptional({ description: 'Customer billing state — used to determine CGST+SGST vs IGST' })
  @IsOptional()
  @IsString()
  billingState?: string;

  @ApiProperty({ type: [PosSaleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosSaleItemDto)
  items: PosSaleItemDto[];

  @ApiPropertyOptional({ type: [AdditionalChargeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdditionalChargeDto)
  additionalCharges?: AdditionalChargeDto[];

  @ApiPropertyOptional({ enum: PosPaymentMode, default: PosPaymentMode.CASH })
  @IsOptional()
  @IsEnum(PosPaymentMode)
  paymentMode?: PosPaymentMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountReceived?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gstin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  depositAccountId?: string;
}