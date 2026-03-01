// src/business/dto/update-business.dto.ts

import { IsOptional, IsString, IsEmail, IsUrl, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Nested DTO for bank details if needed
class BankDetailsDto {
  @IsOptional() @IsString() accountName?: string;
  @IsOptional() @IsString() accountNumber?: string;
  @IsOptional() @IsString() ifscCode?: string;
  @IsOptional() @IsString() bankName?: string;
}

// Nested DTO for social links
class SocialLinksDto {
  @IsOptional() @IsString() facebook?: string;
  @IsOptional() @IsString() instagram?: string;
  @IsOptional() @IsString() twitter?: string;
  @IsOptional() @IsString() linkedin?: string;
}

export class UpdateBusinessDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() postalCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() websiteUrl?: string;
  
  // Specific for authorized signatory
  @ApiPropertyOptional() @IsOptional() @IsString() authorizedSignatoryName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() authorizedSignatoryDesignation?: string;
  // Note: authorizedSignatorySignatureUrl will be handled via file upload

  @ApiPropertyOptional() @IsOptional() @ValidateNested() @Type(() => SocialLinksDto) socialLinks?: SocialLinksDto;
  @ApiPropertyOptional() @IsOptional() @ValidateNested() @Type(() => BankDetailsDto) bankDetails?: BankDetailsDto;

  // Configuration toggles
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPayoutEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;

  // Legal
  @ApiPropertyOptional() @IsOptional() @IsString() legalName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() panNumber?: string;
}