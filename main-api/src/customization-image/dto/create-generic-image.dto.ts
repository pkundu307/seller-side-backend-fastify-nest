import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsJSON,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export enum ImageType {
  CATEGORY = 'category',
  SUBCATEGORY = 'subcategory',
}

export class AddGenericImagesDto {
  @ApiProperty({
    description: 'The ID of the category or subcategory these images are for.',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  categoryOrSubcategoryId: string;

  @ApiProperty({
    description: 'The type of entity these images represent.',
    enum: ImageType,
    example: ImageType.CATEGORY,
  })
  @IsIn([ImageType.CATEGORY, ImageType.SUBCATEGORY])
  type: ImageType;

  @ApiPropertyOptional({
    description: 'A JSON string array of image URLs to add directly. Provide this OR imageFiles.',
    example: '["https://example.com/image1.png", "https://example.com/image2.jpg"]',
  })
  @IsOptional()
  @IsString()
  @IsJSON()
  imageUrls?: string; // Will be parsed from a JSON string
}