import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsInt,
  Min,
  IsOptional,
  IsString,
  IsJSON, // Re-import IsJSON
  IsNotEmpty,
} from 'class-validator';

export class AddToCartDto {
  @ApiProperty({ description: 'The UUID of the Product being added.' })
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({ description: 'The UUID of the specific Variant being added (required for configurable products).' })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiProperty({ description: 'The quantity of the item to add.' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'URL of the customization image (required for customizable items).' })
  @IsString()
  @IsNotEmpty() // Ensures the string is not just empty quotes
  customizationImage: string; // <-- REQUIRED STRING

  @ApiPropertyOptional({ description: 'JSON string containing customization details (e.g., text, colors).' })
  @IsOptional()
  @IsString() // Ensure it's a string if present
  @IsJSON()   // Ensure the string content is valid JSON if present
  customizationDetails?: string; // <-- OPTIONAL JSON STRING
}