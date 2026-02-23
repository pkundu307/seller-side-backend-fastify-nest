// src/payment/dto/create-payment-initiation.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { 
  IsArray, 
  IsInt, 
  IsNotEmpty, 
  IsOptional, 
  IsString, 
  Min, 
  ValidateNested,
  IsObject
} from 'class-validator';

class OrderItemDto {
  @ApiProperty({ description: 'The UUID of the product variant being purchased' })
  @IsString()
  @IsNotEmpty()
  variantId: string;

  @ApiProperty({ description: 'The quantity of this variant', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Any customization details for this item (e.g., engraving text, special instructions)' })
  @IsOptional()
  @IsObject()
  customizationDetails?: Record<string, any>;

  @ApiPropertyOptional({ 
    description: 'Array of customization image URLs',
    type: [String],
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customizationImages?: string[];
}

export class CreatePaymentInitiationDto {
  @ApiProperty({ 
    type: [OrderItemDto], 
    description: 'An array of items to be included in the order' 
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional({ 
    description: 'An optional coupon code to apply to the order' 
  })
  @IsOptional()
  @IsString()
  couponCode?: string;
}
