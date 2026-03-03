import { IsOptional, IsString, IsNumber } from 'class-validator';

export class PurchasePaginationDto {
  @IsOptional() @IsNumber() page?: number;
  @IsOptional() @IsNumber() limit?: number;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
  
  // NEW: Support for presets like 'today', 'last7', 'last30', 'last365'
  @IsOptional() @IsString() filter?: string; 
}