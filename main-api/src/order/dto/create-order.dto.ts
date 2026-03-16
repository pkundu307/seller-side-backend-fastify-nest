// src/orders/dto/create-order.dto.ts

import { IsEnum, IsNotEmpty, IsOptional, IsNumber, IsObject, IsArray, IsString } from 'class-validator';
import { PaymentMethod, Prisma } from '@prisma/client';

export class CreateOrderDto {
  @IsNotEmpty()
  @IsEnum(['online', 'cash_on_delivery'])
  paymentMethod: PaymentMethod;

  @IsNotEmpty()
  @IsObject()
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
  codFee?: number;          // ✅ COD handling fee (flat ₹30)

  @IsOptional()
  @IsNumber()
  platformFee?: number;     // ✅ platform commission

  @IsOptional()
  @IsNumber()
  taxAmount?: number;

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsNumber()
  couponDiscount?: number;
}
