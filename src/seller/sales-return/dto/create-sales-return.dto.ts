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

// Enum for how the money is returned
export enum ReturnAction {
  REFUND_CASH = 'REFUND_CASH',       // Give cash back from drawer
  REFUND_ONLINE = 'REFUND_ONLINE',   // Send money via UPI/Bank
  ADJUST_LEDGER = 'ADJUST_LEDGER'    // Reduce customer's debt (Udhaar cancel)
}

export class ReturnItemDto {
  @ApiProperty({ description: "Variant ID being returned" })
  @IsUUID()
  @IsNotEmpty()
  variantId: string;

  @ApiProperty({ description: "Quantity to return" })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateSalesReturnDto {
  @ApiProperty({ description: "Original Sale ID" })
  @IsUUID()
  @IsNotEmpty()
  saleId: string;

  @ApiProperty({ type: [ReturnItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];

  @ApiProperty({ enum: ReturnAction })
  @IsEnum(ReturnAction)
  action: ReturnAction;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: "Specific shop account ID to deduct refund from" })
  @IsOptional()
  @IsUUID()
  refundAccountId?: string;
}