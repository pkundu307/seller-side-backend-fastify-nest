import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { TicketPriority, TicketStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

export class AdminTicketQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;

  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ description: 'Filter by Business (Optional)' })
  @IsOptional()
  @IsUUID()
  businessId?: string; // <--- Optional: Admin can leave this empty to see ALL businesses
  
  @ApiPropertyOptional({ description: 'Filter by Customer (Optional)' })
  @IsOptional()
  @IsUUID()
  customerUserId?: string; // <--- Optional

}

export class AdminReplyTicketDto {
  @ApiPropertyOptional()
  @IsString()
  message: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  attachmentUrls?: string[];
}

export class AdminUpdateTicketStatusDto {
  @ApiPropertyOptional({ enum: TicketStatus })
  @IsEnum(TicketStatus)
  status: TicketStatus;
}