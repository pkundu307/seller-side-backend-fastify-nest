// create-payment-out.dto.ts
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsDateString, IsEnum, Min } from 'class-validator';

export enum PaymentMode {
  CASH = 'CASH',
  BANK = 'BANK',
  UPI = 'UPI',
  CHEQUE = 'CHEQUE'
}

export class CreatePaymentOutDto {
  @IsString() @IsNotEmpty()
  partyId: string; // The Supplier ID from the 'Party' table

  @IsOptional() @IsString()
  purchaseId?: string; // Specific Purchase Invoice to settle

  @IsNumber() @Min(0.01)
  amount: number;

  @IsString() @IsNotEmpty()
  paymentMode: PaymentMode;

  @IsDateString()
  date: string;

  @IsOptional() @IsString()
  notes?: string;

  @IsOptional() @IsString()
  fromAccountId?: string; // The Bank/Cash account money is leaving from
}

// payment-out-pagination.dto.ts
export class PaymentOutPaginationDto {
  @IsOptional() page?: number;
  @IsOptional() limit?: number;
  @IsOptional() search?: string;
  @IsOptional() startDate?: string;
  @IsOptional() endDate?: string;
}