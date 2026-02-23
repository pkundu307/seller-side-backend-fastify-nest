import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateFixedAssetDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsDateString()
  purchaseDate: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  purchasePrice: number;

  @ApiProperty({ default: 10 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  depreciationRate?: number;
}

export class CreateLoanDto {
  @ApiProperty({ description: "e.g., Bank Loan, Loan from PK" })
  @IsString()
  @IsNotEmpty()
  loanName: string;

  @ApiProperty({ description: "Amount of the loan taken" })
  @IsNumber()
  @Min(1)
  amount: number;
}

export class CreateLoanLiabilityDto {
  @ApiProperty({ description: "e.g., Bank Loan, Loan from PK" })
  @IsString()
  @IsNotEmpty()
  loanName: string;

  @ApiProperty({ description: "Amount of the loan taken" })
  @IsNumber()
  @Min(1)
  amount: number;
}

export class CreateLoanAdvanceDto {
  @ApiProperty({ description: "e.g., Loan to Employee, Advance to Supplier" })
  @IsString()
  @IsNotEmpty()
  partyName: string;

  @ApiProperty({ description: "Amount of the loan given" })
  @IsNumber()
  @Min(1)
  amount: number;
}

export class CreateInvestmentDto {
  @ApiProperty({ description: "e.g., Stock Market, Mutual Fund" })
  @IsString()
  @IsNotEmpty()
  investmentName: string;

  @ApiProperty({ description: "Amount invested" })
  @IsNumber()
  @Min(1)
  amount: number;
}

// --- DTOs for Manual Balance Sheet Entries ---

export class CreateCapitalDto {
  @ApiProperty({ description: "Source of capital (e.g., Owner's Investment)" })
  @IsString()
  @IsNotEmpty()
  sourceName: string;

  @ApiProperty({ description: "Amount of capital introduced" })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ description: "Date of capital introduction" })
  @IsDateString()
  date: string;
}

export class CreateTaxPayableDto {
  @ApiProperty({ enum: ['TDS_PAYABLE', 'TCS_PAYABLE'] })
  @IsEnum(['TDS_PAYABLE', 'TCS_PAYABLE'])
  taxType: 'TDS_PAYABLE' | 'TCS_PAYABLE';

  @ApiProperty({ description: "e.g., TDS on Rent" })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  amount: number;
}