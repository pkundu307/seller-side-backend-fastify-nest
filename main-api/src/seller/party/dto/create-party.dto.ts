// DTO for creating a Party (Customer/Supplier) with all relevant details
import {
  IsString, IsOptional, IsEmail,
  IsEnum, IsNumber, IsBoolean,
  IsObject, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PartyType {
  CUSTOMER = 'CUSTOMER',
  SUPPLIER = 'SUPPLIER',
}

export enum OpeningBalanceType {
  TO_COLLECT = 'TO_COLLECT',
  TO_PAY     = 'TO_PAY',
}

export class CreatePartyDto {
  // ── Required ──────────────────────────────────────────
  @IsString()
  partyName: string;

  // ── Optional Basic ────────────────────────────────────
  @IsOptional()
  @IsString()
  phoneNo?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(PartyType)
  partyType?: PartyType;          // defaults to CUSTOMER

  @IsOptional()
  @IsString()
  partyCategory?: string;

  @IsOptional()
  @IsBoolean()
  isBusiness?: boolean;

  @IsOptional()
  @IsString()
  businessName?: string;

  // ── Tax / Business IDs ────────────────────────────────
  @IsOptional()
  @IsString()
  taxId?: string;                 // GSTIN

  @IsOptional()
  @IsString()
  panNo?: string;

  // ── Address ───────────────────────────────────────────
  @IsOptional()
  @IsObject()
  billingAddress?: Record<string, any>;

  @IsOptional()
  @IsObject()
  shippingAddress?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isBillingShippingSame?: boolean;

  // ── Opening Balance ───────────────────────────────────
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  openingBalance?: number;

  @IsOptional()
  @IsEnum(OpeningBalanceType)
  openingBalanceType?: OpeningBalanceType;

  // ── Credit ────────────────────────────────────────────
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  creditPeriod?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  creditLimit?: number;

  // ── Custom Fields ─────────────────────────────────────
  @IsOptional()
  @IsObject()
  customField?: Record<string, string>;

  // ── Notes ─────────────────────────────────────────────
  @IsOptional()
  @IsString()
  notes?: string;
}
