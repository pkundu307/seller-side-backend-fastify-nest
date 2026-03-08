import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PartyType } from './create-party.dto';

export class PartyQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;         // search by name, phone, email

  @IsOptional()
  @IsEnum(PartyType)
  partyType?: PartyType;   // filter CUSTOMER | SUPPLIER

  @IsOptional()
  @IsString()
  partyCategory?: string;
}
