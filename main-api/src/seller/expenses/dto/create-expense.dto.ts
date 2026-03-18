// src/seller/expenses/dto/create-expense.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsDateString, IsEnum, IsNotEmpty,
  IsNumber, IsOptional, IsString, Min, ValidateNested,
  ArrayMinSize,
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

  @ApiProperty({ description: 'Base amount before tax' })
  @IsNumber()
  @Min(0)
  taxableAmount: number;

  @ApiProperty({ description: 'GST Rate (0, 5, 12, 18, 28)', default: 0 })
  @IsNumber()
  @Min(0)
  taxRate: number;

  @ApiPropertyOptional({ description: 'CESS amount if applicable', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
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

  @ApiPropertyOptional({ default: false, description: 'Is this expense already paid?' })
  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;                   // ✅ ADDED — used in service for ledger deduction

  @ApiPropertyOptional({ description: 'CASH, BANK, UPI, CHEQUE' })
  @IsOptional()
  @IsString()
  paymentMode?: string;

  @ApiPropertyOptional({ description: 'ID of the Bank/Cash account to deduct money from' })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional({ description: 'Additional notes or remarks' })
  @IsOptional()
  @IsString()
  notes?: string;                     // ✅ ADDED — used in service for expense.notes

  @ApiProperty({ type: [ExpenseItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one item is required' })  // ✅ ADDED — prevents empty items
  @ValidateNested({ each: true })
  @Type(() => ExpenseItemDto)
  items: ExpenseItemDto[];
}
