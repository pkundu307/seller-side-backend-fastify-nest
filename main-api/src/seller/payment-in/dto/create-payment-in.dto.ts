import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PosPaymentMode } from '../../dto/create-pos-sale.dto';

export class CreatePaymentInDto {
  @ApiProperty({ description: "ID of the customer paying" })
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @ApiPropertyOptional({ description: "Specific Sale/Invoice ID to settle (Optional)" })
  @IsOptional()
  @IsUUID()
  saleId?: string; // <--- NEW FIELD

  @ApiProperty({ description: "Amount received" })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ enum: PosPaymentMode })
  @IsEnum(PosPaymentMode)
  paymentMode: PosPaymentMode;

  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: "Specific shop account ID to deposit into" })
  @IsOptional()
  @IsUUID()
  depositAccountId?: string;
}