import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { PosPaymentMode } from '../../dto/create-pos-sale.dto';

export class ConvertQuotationDto {
  @ApiProperty({ enum: PosPaymentMode, default: PosPaymentMode.CASH })
  @IsEnum(PosPaymentMode)
  paymentMode: PosPaymentMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountReceived?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  depositAccountId?: string;
}