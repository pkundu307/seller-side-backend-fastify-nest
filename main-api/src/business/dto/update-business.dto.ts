// src/business/dto/update-business.dto.ts

import {
  IsOptional, IsString, IsBoolean, IsInt,
  Min, ValidateNested, IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

// ── Nested DTOs ────────────────────────────────────────────────────────────────

class SocialLinksDto {
  @IsOptional() @IsString() facebook?: string;
  @IsOptional() @IsString() instagram?: string;
  @IsOptional() @IsString() twitter?: string;
  @IsOptional() @IsString() linkedin?: string;
  @IsOptional() @IsString() youtube?: string;
}

class InvoiceConfigDto {
  @IsOptional() @IsString()       invoicePrefix?: string;
  @IsOptional() @IsString()       purchaseInvoicePrefix?: string;
  @IsOptional() @IsInt() @Min(1)  invoiceStartNumber?: number;
  @IsOptional() @IsInt() @Min(1)  purchaseStartNumber?: number;
  @IsOptional() @IsString()       fiscalYearStart?: string;
  @IsOptional() @IsString()       invoiceNotes?: string;
  @IsOptional() @IsString()       invoiceTerms?: string;
}

// ── KYC Documents ─────────────────────────────────────────────────────────────
// Field names match SellerKycDocumentType enum values in Prisma.
// Each value should be a URL of the uploaded document.
class KycDocumentsDto {
  @ApiPropertyOptional({ description: 'URL of PAN card document' })
  @IsOptional() @IsString()
  PAN?: string;

  @ApiPropertyOptional({ description: 'URL of GST Registration Certificate' })
  @IsOptional() @IsString()
  GST_CERTIFICATE?: string;

  @ApiPropertyOptional({ description: 'URL of Bank Proof (cancelled cheque / passbook)' })
  @IsOptional() @IsString()
  BANK_PROOF?: string;

  @ApiPropertyOptional({ description: 'URL of Address Proof (utility bill / rent agreement)' })
  @IsOptional() @IsString()
  ADDRESS_PROOF?: string;
}

// ── Main DTO ───────────────────────────────────────────────────────────────────

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

  // ── Legal ──
  @ApiPropertyOptional() @IsOptional() @IsString()  legalName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()  panNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()  businessType?: string;
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

  // ── Invoice Config ──
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => InvoiceConfigDto)
  invoiceConfig?: InvoiceConfigDto;

  // ── KYC Documents ──
  // Seller provides document URLs. Each provided type gets upserted
  // into SellerKycDocument table with status reset to PENDING.
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => KycDocumentsDto)
  kycDocuments?: KycDocumentsDto;

  // ── Preferences ──
  @ApiPropertyOptional() @IsOptional() @IsString()  currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()  timezone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()  dateFormat?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()  language?: string;

  // ── Platform Toggles (owner only) ──
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPayoutEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
