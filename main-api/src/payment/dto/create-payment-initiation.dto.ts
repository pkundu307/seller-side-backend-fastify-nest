// src/payment/dto/create-payment-initiation.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

class OrderItemDto {
  @ApiProperty({ description: 'UUID of the product variant' })
  @IsString()
  @IsNotEmpty()
  variantId: string;

  @ApiProperty({ description: 'Quantity (min 1)', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Customization details for this item' })
  @IsOptional()
  @IsObject()
  customizationDetails?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Customization image URLs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customizationImages?: string[];
}

export class CreatePaymentInitiationDto {
  @ApiProperty({ type: [OrderItemDto], description: 'Items to purchase' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ description: 'The address ID selected by the customer for delivery' })
  @IsUUID()
  @IsNotEmpty()
  selectedAddressId: string;          // ← ADDED: required for Xpressbees shipping calc

  @ApiPropertyOptional({ description: 'Optional coupon code' })
  @IsOptional()
  @IsString()
  couponCode?: string;
}
