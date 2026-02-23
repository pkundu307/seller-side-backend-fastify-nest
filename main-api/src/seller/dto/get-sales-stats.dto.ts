import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class GetSalesStatsDto {
  @ApiPropertyOptional({ description: 'Start date (ISO format). Defaults to 30 days ago.' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'End date (ISO format). Defaults to today.' })
  @IsOptional()
  @IsDateString()
  to?: string;
}