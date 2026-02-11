import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, IsEnum } from 'class-validator';
import { SellerKycStatus } from '@prisma/client';

export class UpdateBusinessDetailsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: SellerKycStatus })
  @IsOptional()
  @IsEnum(SellerKycStatus)
  kycStatus?: SellerKycStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gstNumber?: string;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  commissionRate?: number; // If you handle custom commission per business
}