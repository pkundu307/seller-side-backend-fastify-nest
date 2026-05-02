import { IsString, IsOptional, IsEmail, IsEnum, IsNumber, IsBoolean, IsObject, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum PartyType { CUSTOMER = 'CUSTOMER', SUPPLIER = 'SUPPLIER' }
export enum OpeningBalanceType { TO_COLLECT = 'TO_COLLECT', TO_PAY = 'TO_PAY' }

export class BankAccountDto {
  @IsString() bankName: string;
  @IsString() accountNo: string;
  @IsOptional() @IsString() ifscCode?: string;
  @IsOptional() @IsString() accountHolder?: string;
  @IsOptional() @IsString() upiId?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class CreatePartyDto {
  @IsString() partyName: string;
  @IsOptional() @IsString() phoneNo?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsEnum(PartyType) partyType?: PartyType;
  @IsOptional() @IsString() partyCategory?: string;
  @IsOptional() @IsBoolean() isBusiness?: boolean;
  @IsOptional() @IsString() businessName?: string;
  @IsOptional() @IsString() taxId?: string;
  @IsOptional() @IsString() panNo?: string;
  @IsOptional() @IsObject() billingAddress?: any;
  @IsOptional() @IsObject() shippingAddress?: any;
  @IsOptional() @IsBoolean() isBillingShippingSame?: boolean;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) openingBalance?: number;
  @IsOptional() @IsEnum(OpeningBalanceType) openingBalanceType?: OpeningBalanceType;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) creditPeriod?: number;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) creditLimit?: number;
  @IsOptional() @IsObject() customField?: any;
  @IsOptional() @IsString() notes?: string;
  
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BankAccountDto)
  bankAccounts?: BankAccountDto[];
}