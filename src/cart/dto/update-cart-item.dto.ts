import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, Min, IsOptional, IsString, IsJSON } from 'class-validator';

export class UpdateCartItemDto {
  @ApiPropertyOptional({ description: 'The new quantity of the item.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ description: 'New URL of the customization image.' })
  @IsOptional()
  @IsString()
  customizationImage?: string;

  @ApiPropertyOptional({ description: 'New JSON string containing customization details.' })
  @IsOptional()
  @IsString()
  @IsJSON()
  customizationDetails?: string;
}