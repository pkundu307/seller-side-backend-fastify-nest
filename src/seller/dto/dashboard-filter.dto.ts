// src/seller/dto/dashboard-filter.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class DashboardFilterDto {
  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD). Defaults to 30 days ago.' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD). Defaults to today.' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}