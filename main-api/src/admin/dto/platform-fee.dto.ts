import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { FeeCalculationType, PlatformFeeType } from "@prisma/client";

export class CreatePlatformFeeDto {

  @IsEnum(PlatformFeeType)
  feeType: PlatformFeeType;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(FeeCalculationType)
  calculationType: FeeCalculationType;

  @IsOptional()
  @IsNumber()
  rate?: number;

  @IsOptional()
  @IsNumber()
  amount?: number;
}


export class UpdatePlatformFeeDto {

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(FeeCalculationType)
  calculationType?: FeeCalculationType;

  @IsOptional()
  @IsNumber()
  rate?: number;

  @IsOptional()
  @IsNumber()
  amount?: number;
}