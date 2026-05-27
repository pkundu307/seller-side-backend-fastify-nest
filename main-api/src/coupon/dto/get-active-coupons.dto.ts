import { IsOptional, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetActiveCouponsDto {
  @ApiPropertyOptional({ description: 'Page number (default: 1)', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page (default: 20)', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
