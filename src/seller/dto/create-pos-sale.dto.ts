import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { 
  IsArray, 
  IsEnum, 
  IsInt, 
  IsNotEmpty, 
  IsNumber, 
  IsOptional, 
  IsString, 
  IsUUID, 
  Min, 
  ValidateNested 
} from 'class-validator';

// 1. Enum for Payment Modes
export enum PosPaymentMode {
  CASH = 'CASH',
  ONLINE = 'ONLINE', // Maps to UPI/Bank in backend logic usually
  CHEQUE = 'CHEQUE'
}

// 2. Sub-DTO for Sale Items
export class PosSaleItemDto {
  @ApiProperty({ description: 'The UUID of the product variant being sold.' })
  @IsUUID()
  @IsNotEmpty()
  variantId: string;

  @ApiProperty({ description: 'The quantity being sold.' })
  @IsInt()
  @Min(1)
  quantity: number;
}

// 3. Sub-DTO for Additional Charges (e.g., Shipping, Bag)
export class AdditionalChargeDto {
  @ApiProperty({ description: 'Name of charge (e.g., Carry Bag, Delivery)' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Amount for the charge' })
  @IsNumber()
  @Min(0)
  amount: number;
}

// 4. Main DTO
export class CreatePosSaleDto {
  // --- Customer Details ---
  @ApiPropertyOptional({ description: "Customer's name. Defaults to 'Walk-in Customer'" })
  @IsOptional()
  @IsString()
  customerName?: string;
  
  @ApiPropertyOptional({ description: "Customer's phone number. Required for Credit sales." })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({ description: "Email for digital invoice" })
  @IsOptional()
  @IsString()
  email?: string;

  // --- Invoice Items ---
  @ApiProperty({ type: [PosSaleItemDto], description: "List of products to sell" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosSaleItemDto)
  items: PosSaleItemDto[];

  // --- Additional Charges ---
  @ApiPropertyOptional({ type: [AdditionalChargeDto], description: "Extra charges like Packaging/Delivery" })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdditionalChargeDto)
  additionalCharges?: AdditionalChargeDto[];

  // --- Payment Details ---
  @ApiPropertyOptional({ enum: PosPaymentMode, default: PosPaymentMode.CASH })
  @IsOptional()
  @IsEnum(PosPaymentMode)
  paymentMode?: PosPaymentMode;

  @ApiPropertyOptional({ description: "Amount actually received. If less than Total, remainder is Credit (Udhaar)." })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountReceived?: number;

  // --- B2B / Tax Fields ---
  @ApiPropertyOptional({ description: "GSTIN for B2B tax credit" })
  @IsOptional()
  @IsString()
  gstin?: string;

  @ApiPropertyOptional({ description: "Full address (Required if GSTIN provided)" })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: "PAN for high value txns" })
  @IsOptional()
  @IsString()
  pan?: string;

  @ApiPropertyOptional({ description: "Specific Bank/Cash Account UUID to deposit money into" })
  @IsOptional()
  @IsUUID()
  depositAccountId?: string;
}