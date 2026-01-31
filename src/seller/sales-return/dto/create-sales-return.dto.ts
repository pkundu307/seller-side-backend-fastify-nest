import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { 
  IsArray, 
  IsBoolean, 
  IsEnum, 
  IsInt, 
  IsNotEmpty, 
  IsOptional, 
  IsString, 
  IsUUID, 
  Min, 
  ValidateNested 
} from 'class-validator';

export enum ReturnAction {
  REFUND_CASH = 'REFUND_CASH',
  REFUND_ONLINE = 'REFUND_ONLINE',
  ADJUST_LEDGER = 'ADJUST_LEDGER'
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

  @ApiProperty({ 
    description: "If true, stock increases. If false, item is scrapped (damaged).", 
    default: true 
  })
  @IsBoolean()
  @IsOptional()
  isRestock?: boolean = true; // Default to putting back on shelf
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  refundAccountId?: string;
}