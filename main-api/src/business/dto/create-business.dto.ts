// src/business/dto/create-business.dto.ts
import { IsString, IsEnum, IsOptional, IsNotEmpty, IsBoolean, Equals } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IndustryType } from '@prisma/client';

export class CreateBusinessDto {
  @ApiProperty({ example: 'My Awesome Shop' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: IndustryType, default: IndustryType.RETAIL_GENERAL })
  @IsEnum(IndustryType)
  industryType: IndustryType;

  @ApiPropertyOptional({ example: '22AAAAA0000A1Z5' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()  // ensures if provided, it can't be an empty string
  gstNumber?: string;

  @ApiProperty({ example: '123 Business Street' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Mumbai' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'Maharashtra' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: 'India' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ example: '400001' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: 'Fashion & Retail' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    example: true,
    description: 'User must accept terms to proceed',
  })
  @IsBoolean()
  @Equals(true, { message: 'You must accept the Seller Services Agreement to continue.' })
  sellerAgreementAccepted: boolean;

  @ApiProperty({
    example: 'v1.0',
    description: 'The version of the agreement displayed to the user',
  })
  @IsString()
  @IsNotEmpty()
  sellerAgreementVersion: string;
}
