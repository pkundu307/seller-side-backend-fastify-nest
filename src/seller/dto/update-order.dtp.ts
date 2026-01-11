import { ApiPropertyOptional } from "@nestjs/swagger";
import { OrderStatus } from "@prisma/client"; // Keep for the type
import { IsDate, IsEnum, IsOptional, IsString } from "class-validator";

export class UpdateSellerOrderDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  // --- FIX ---
  @IsEnum(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
  @IsOptional()
  status?: OrderStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  trackingNumber?: string;

  @ApiPropertyOptional({ description: 'Reason for cancellation, required if status is CANCELLED' })
  @IsString()
  @IsOptional()
  cancellationReason?: string;
  
  @ApiPropertyOptional()
  @IsDate()
  @IsOptional()
  estimatedDeliveryDate?: Date;
}