// src/business/dto/create-business.dto.ts
import { IsString, IsEnum, IsOptional, IsNotEmpty } from 'class-validator';
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

  @ApiProperty({ example: '22AAAAA0000A1Z5' })
  @IsString()
  @IsNotEmpty()
  gstNumber: string;

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
}