import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min, IsUUID } from 'class-validator';

export class CreateBankAccountDto {
  @ApiProperty({ enum: AccountType, example: 'BANK' })
  @IsEnum(AccountType)
  accountType: AccountType;

  @ApiProperty({ example: 'HDFC Main Account' })
  @IsString()
  @IsNotEmpty()
  accountName: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  openingBalance?: number;

  // Optional Bank Details
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAccountNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankIfscCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAccountHolder?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  upiId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateBankAccountDto extends CreateBankAccountDto {}

export class TransferMoneyDto {
  @ApiProperty({ description: "ID of the account money is coming FROM" })
  @IsUUID()
  fromAccountId: string;

  @ApiProperty({ description: "ID of the account money is going TO" })
  @IsUUID()
  toAccountId: string;

  @ApiProperty({ minimum: 1 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}