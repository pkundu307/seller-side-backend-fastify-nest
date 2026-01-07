import { PartialType } from '@nestjs/mapped-types';
import { CreateAddressDto } from './create-address.dto';

// PartialType makes all properties of CreateAddressDto optional
export class UpdateAddressDto extends PartialType(CreateAddressDto) {}