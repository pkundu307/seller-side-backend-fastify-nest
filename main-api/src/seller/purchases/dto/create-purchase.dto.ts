// create-purchase.dto.ts
import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsDateString, IsBoolean, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseItemDto {
  @IsString() variantId: string;
  @IsString() itemName: string; // Historical snapshot
  @IsOptional() @IsString() hsnCode?: string;
  @IsNumber() quantity: number;
  @IsNumber() purchasePrice: number;
  @IsNumber() taxRate: number;
  @IsOptional() @IsNumber() discount?: number;
}

export class CreatePurchaseDto {
  @IsString() supplierName: string;
  @IsOptional() @IsString() supplierGstin?: string;
  @IsString() purchaseOrderNo: string; // The Invoice Number from UI
  @IsDateString() purchaseOrderDate: string;
  @IsOptional() @IsDateString() dueDate?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];

  @IsNumber() amountPaid: number;
  @IsOptional() @IsNumber() additionalCharges?: number;
  @IsOptional() @IsNumber() tcsRate?: number; // e.g. 0.1
  @IsBoolean() autoRoundOff: boolean;
  
  @IsOptional() @IsString() depositAccountId?: string; // Which bank/cash paid from
  @IsOptional() @IsString() notes?: string;
}

