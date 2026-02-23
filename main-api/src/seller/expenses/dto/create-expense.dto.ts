import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { 
  IsArray, IsBoolean, IsDateString, IsEnum, IsNotEmpty, 
  IsNumber, IsOptional, IsString, Min, ValidateNested 
} from 'class-validator';
import { ExpenseCategory } from '@prisma/client';

export class ExpenseItemDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hsnCode?: string;

  @ApiProperty({ description: "Base amount before tax" })
  @IsNumber()
  @Min(0)
  taxableAmount: number;

  @ApiProperty({ description: "GST Rate (0, 5, 12, 18, 28)", default: 0 })
  @IsNumber()
  @Min(0)
  taxRate: number;

  @ApiPropertyOptional({ description: "CESS amount if applicable", default: 0 })
  @IsOptional()
  @IsNumber()
  cessAmount?: number;
}

export class CreateExpenseDto {
  @ApiProperty()
  @IsDateString()
  expenseDate: string;

  @ApiProperty({ enum: ExpenseCategory })
  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vendorName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vendorGstin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  placeOfSupply?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoiceRef?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isRcmApplicable?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  itcClaimed?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentMode?: string; // CASH, BANK, UPI

  @ApiPropertyOptional({ description: "ID of the Bank/Cash account to deduct money from" })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiProperty({ type: [ExpenseItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseItemDto)
  items: ExpenseItemDto[];
}