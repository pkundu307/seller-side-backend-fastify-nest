import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Min,
} from 'class-validator';

export class AddToCartDto {
  @ApiProperty({ description: 'The ID of the product.' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({ description: 'The ID of the product variant, if applicable.' })
  @IsUUID()
  @IsOptional()
  variantId?: string;

  @ApiProperty({ description: 'The quantity of the item to add.', default: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  // --- CHANGED ---
  @ApiPropertyOptional({ 
    description: 'An array of URLs for customized images.',
    type: [String], // Important for Swagger
    example: ['https://example.com/image1.png', 'https://example.com/image2.png'] 
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true }) // Validates that each item in the array is a URL
  customizationImages?: string[];

  @ApiPropertyOptional({ description: 'JSON string of customization details.' })
  @IsOptional()
  @IsString()
  customizationDetails?: string;
}