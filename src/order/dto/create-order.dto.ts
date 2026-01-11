// src/orders/dto/create-order.dto.ts
import { IsEnum, IsNotEmpty, IsOptional, IsNumber, IsObject, IsArray, IsString } from 'class-validator';
import { PaymentMethod, Prisma } from '@prisma/client'; // Keep this for the type annotation

export class CreateOrderDto {
  @IsNotEmpty()
  // --- THIS IS THE FIX ---
  // Instead of passing the imported PaymentMethod object (which can be undefined during a circular dependency),
  // we pass a simple array of the valid string values.
  // This has no dependencies and will always be defined.
  @IsEnum(['online', 'cash_on_delivery'])
  paymentMethod: PaymentMethod; // The property type itself remains the safe Prisma type.

  @IsNotEmpty()
  @IsObject()
  // For better type safety, you could create a specific nested DTO for the address,
  // but for now, this will accept the JSON object from the frontend.
  selectedAddress: Prisma.JsonObject;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  cartItemIds: string[];

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