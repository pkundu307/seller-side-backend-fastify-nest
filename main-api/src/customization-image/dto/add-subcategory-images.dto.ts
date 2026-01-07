import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsJSON, IsOptional, IsString, IsUUID } from 'class-validator';

export class AddSubCategoryImagesDto {
  @ApiProperty({
    description: 'The ID of the subcategory to which these images will be added.',
    example: 'b2c3d4e5-f6a7-8901-2345-67890abcdef1',
  })
  @IsString()
  @IsUUID()
  subCategoryId: string;

  @ApiPropertyOptional({
    description: 'A JSON string array of image URLs. Provide this OR imageFiles.',
    example: '["https://example.com/image1.png", "https://example.com/image2.jpg"]',
  })
  @IsOptional()
  @IsString()
  @IsJSON()
  imageUrls?: string;
}