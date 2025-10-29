import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class UpdateCartItemDto {
  @ApiPropertyOptional({ description: 'The new quantity for the cart item.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  // --- CHANGED ---
  @ApiPropertyOptional({ 
    description: 'A new array of URLs for customized images.',
    type: [String], 
    example: ['https://example.com/new_image.png'] 
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  customizationImages?: string[];

  @ApiPropertyOptional({ description: 'New JSON string of customization details.' })
  @IsOptional()
  @IsString()
  customizationDetails?: string;
}