// src/business/dto/update-business.dto.ts

import {
  IsOptional, IsString, IsBoolean, IsInt,
  IsNumber, Min, ValidateNested, IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

// ── Nested DTOs ──

class SocialLinksDto {
  @IsOptional() @IsString() facebook?: string;
  @IsOptional() @IsString() instagram?: string;
  @IsOptional() @IsString() twitter?: string;
  @IsOptional() @IsString() linkedin?: string;
  @IsOptional() @IsString() youtube?: string;
}

class InvoiceConfigDto {
  @IsOptional() @IsString()  invoicePrefix?: string;
  @IsOptional() @IsString()  purchaseInvoicePrefix?: string;
  @IsOptional() @IsInt() @Min(1) invoiceStartNumber?: number;
  @IsOptional() @IsInt() @Min(1) purchaseStartNumber?: number;
  @IsOptional() @IsString()  fiscalYearStart?: string;   // "April"
  @IsOptional() @IsString()  invoiceNotes?: string;
  @IsOptional() @IsString()  invoiceTerms?: string;
}

// ── Main DTO ──

export class UpdateBusinessDto {

  // ── Basic Profile ──
  @ApiPropertyOptional() @IsOptional() @IsString()  name?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail()   email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()  description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()  phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()  websiteUrl?: string;

  // ── Address ──
  @ApiPropertyOptional() @IsOptional() @IsString()  address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()  city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()  state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()  country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()  postalCode?: string;

  // ── Legal (gstNumber intentionally excluded — read-only, needs support ticket) ──
  @ApiPropertyOptional() @IsOptional() @IsString()  legalName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()  panNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()  businessType?: string;  // "Proprietorship", "LLP"
  @ApiPropertyOptional() @IsOptional() @IsString()  category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()  industryType?: string;

  // ── Authorized Signatory ──
  @ApiPropertyOptional() @IsOptional() @IsString()  authorizedSignatoryName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()  authorizedSignatoryDesignation?: string;
  // authorizedSignatorySignatureUrl → handled via file upload in controller

  // ── Social Links ──
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;

  // ── Invoice Config (NEW) ──
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => InvoiceConfigDto)
  invoiceConfig?: InvoiceConfigDto;

  // ── Preferences (NEW) ──
  @ApiPropertyOptional() @IsOptional() @IsString()  currency?: string;    // "INR", "USD"
  @ApiPropertyOptional() @IsOptional() @IsString()  timezone?: string;    // "Asia/Kolkata"
  @ApiPropertyOptional() @IsOptional() @IsString()  dateFormat?: string;  // "DD/MM/YYYY"
  @ApiPropertyOptional() @IsOptional() @IsString()  language?: string;    // "en", "hi"

  // ── Platform Toggles (owner only) ──
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPayoutEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
