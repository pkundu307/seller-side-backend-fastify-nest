import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { OrderStatus, PaymentMethod } from '@prisma/client'; // Keep for the types

export class SellerPaginationDto {
  @ApiPropertyOptional({ description: 'Page number for pagination', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter by order status', enum: OrderStatus })
  @IsOptional()
  // --- FIX ---
  @IsEnum(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'Filter by payment method', enum: PaymentMethod })
  @IsOptional()
  // --- FIX ---
  @IsEnum(['online', 'cash_on_delivery'])
  paymentMethod?: PaymentMethod;
  
  @ApiPropertyOptional({ description: 'Search by order number' })
  @IsOptional()
  @IsString()
  search?: string;
}