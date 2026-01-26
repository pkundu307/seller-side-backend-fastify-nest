import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class SalePaginationDto {
  @ApiPropertyOptional({ description: 'Page number for pagination', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 15;

  @ApiPropertyOptional({ description: 'Search by invoice number or customer name' })
  @IsOptional()
  @IsString()
  search?: string;

    @ApiPropertyOptional({ description: 'Start date (ISO format YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO format YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}