import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

class ProformaItemDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  itemName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price: number;
}

export class CreateProformaInvoiceDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  partyName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  partyPhone?: string;

  @ApiPropertyOptional({ description: "Link to an existing customer user" })
  @IsOptional()
  @IsUUID()
  customerUserId?: string;

  @ApiProperty()
  @IsDateString()
  validUntil: string;

  @ApiProperty({ type: [ProformaItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProformaItemDto)
  items: ProformaItemDto[];
}