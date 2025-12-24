import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ description: 'Street address', example: '123 Main Street' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({ description: 'City name', example: 'Mumbai' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'State or province', example: 'Maharashtra' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ description: 'Postal or ZIP code', example: '400001' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @ApiProperty({ description: 'Country name', example: 'India' })
  @IsString()
  @IsNotEmpty()
  country: string;

  // --- ADDED/UPDATED FIELDS ---
  @ApiPropertyOptional({ description: 'e.g., Near City Mall', required: false })
  @IsOptional()
  @IsString()
  landmark?: string;

  @ApiPropertyOptional({ description: 'An alternative phone number', required: false })
  @IsOptional()
  @IsString()
  alternativePhoneNumber?: string;

  @ApiPropertyOptional({ description: 'Address type (e.g., HOME, WORK)', default: 'HOME', required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Set this address as the default for the user', default: false, required: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}