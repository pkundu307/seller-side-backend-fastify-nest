import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class PosSaleItemDto {
  @ApiProperty({ description: 'The UUID of the product variant being sold.' })
  @IsString()
  @IsNotEmpty()
  variantId: string;

  @ApiProperty({ description: 'The quantity being sold.' })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreatePosSaleDto {
  @ApiPropertyOptional({ description: "Customer's name for the invoice." })
  @IsOptional()
  @IsString()
  customerName?: string;
  
  @ApiPropertyOptional({ description: "Customer's phone number." })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiProperty({ type: [PosSaleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosSaleItemDto)
  items: PosSaleItemDto[];
}