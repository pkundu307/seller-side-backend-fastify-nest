// src/orders/dto/create-order.dto.ts
import { IsEnum, IsNotEmpty, IsOptional, IsNumber, IsObject, IsArray, IsString } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreateOrderDto {
  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod; // Should be 'cash_on_delivery'

  @IsNotEmpty()
  @IsObject()
  selectedAddress: any; // Or use a specific Address DTO/Interface

  // --- NEW FIELD ---
  @IsArray()
  @IsString({ each: true }) // Ensures every item in array is a string
  @IsNotEmpty()
  cartItemIds: string[]; // The IDs of the specific items to order

  @IsOptional()
  @IsNumber()
  shippingFee?: number;

  @IsOptional()
  @IsNumber()
  taxAmount?: number;

  @IsOptional()
  @IsNumber()
  discount?: number;
}