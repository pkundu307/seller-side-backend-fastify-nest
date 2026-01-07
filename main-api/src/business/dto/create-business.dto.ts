import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBusinessDto {
  @ApiProperty({ description: 'Name of the business' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'GST number of the business' })
  @IsString()
  gstNumber: string;

  @ApiProperty({ description: 'Street address of the business' })
  @IsString()
  address: string;

  @ApiProperty({ description: 'City where the business is located' })
  @IsString()
  city: string;

  @ApiProperty({ description: 'State where the business is located' })
  @IsString()
  state: string;

  @ApiProperty({ description: 'Country where the business is located' })
  @IsString()
  country: string;

  @ApiProperty({ description: 'Postal code for the business address' })
  @IsString()
  postalCode: string;

  @ApiProperty({ description: 'Contact phone number for the business' })
  @IsString()
  phone: string;
}