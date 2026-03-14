import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

// create-address.dto.ts
export class CreateAddressDto {
  @ApiProperty({ example: '123 Main Street' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({ example: 'Howrah' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'West Bengal' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiPropertyOptional({ example: '19', description: 'GST State Code' })
  @IsOptional()
  @IsString()
  stateCode?: string;

  @ApiProperty({ example: '711101' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @ApiProperty({ example: 'India', default: 'India' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  landmark?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alternativePhoneNumber?: string;

  @ApiPropertyOptional({ enum: ['HOME', 'WORK', 'OTHER'], default: 'HOME' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}