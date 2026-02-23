import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { NotificationChannel } from '@prisma/client';

export class AddToWaitlistDto {
  @ApiProperty({ description: 'The ID of the product to watch' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({ description: 'Specific variant ID (e.g., Size L, Color Red)' })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiPropertyOptional({ 
    enum: NotificationChannel, 
    default: NotificationChannel.EMAIL,
    description: 'Preferred notification method' 
  })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;
}