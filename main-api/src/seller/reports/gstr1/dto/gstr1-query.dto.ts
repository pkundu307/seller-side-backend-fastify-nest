// src/seller/reports/gstr1/dto/gstr1-query.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, Matches } from 'class-validator';

export class Gstr1QueryDto {
  @ApiPropertyOptional({ description: 'Month in YYYY-MM format e.g. 2026-03' })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month must be YYYY-MM format' })
  month?: string;

  @ApiPropertyOptional({ description: 'Custom start date — overrides month' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Custom end date — overrides month' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by source: online | offline | all', default: 'all' })
  @IsOptional()
  @IsIn(['online', 'offline', 'all'])
  source?: 'online' | 'offline' | 'all';
}
