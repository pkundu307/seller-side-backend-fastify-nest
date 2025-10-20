import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateCustomizationImageDto {
  @ApiProperty({
    description: 'The main category for the image (e.g., "Occasions", "Graphics").',
    example: 'Occasions',
  })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({
    description: 'The sub-category for the image (e.g., "Birthday", "Anniversary").',
    example: 'Birthday',
  })
  @IsString()
  @IsNotEmpty()
  subCategory: string;

  @ApiPropertyOptional({
    description: 'An external URL of the image. Provide this OR upload an imageFile, but not both.',
    example: 'https://example.com/image.png',
  })
  @IsOptional()
  @IsUrl()
  url?: string;
}