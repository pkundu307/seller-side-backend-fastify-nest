import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class AddToCartDto {
  @ApiProperty({
    description: 'The ID of the product to add to the cart.',
    example: '44787cc1-a1be-48b6-99cc-d7cae0e37c1b',
  })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({
    description: 'The ID of the product variant, if applicable.',
    example: '9dca70c5-77df-4d28-8ed7-d7886df29df8',
  })
  @IsUUID()
  @IsOptional()
  variantId?: string;

  @ApiProperty({
    description: 'Quantity of this product to add.',
    default: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    description:
      'JSON string containing customization details like message, color, etc.',
    example: '{"instructions":"Add Happy Birthday text","font":"Arial"}',
  })
  @IsOptional()
  @IsString()
  customizationDetails?: string;
}
