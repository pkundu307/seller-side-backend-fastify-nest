import { ApiProperty } from "@nestjs/swagger";


export class CreateBusinessDto {
  @ApiProperty()
    name: string;
  @ApiProperty()
    gstNumber: string;
  @ApiProperty()
    address: string;
  @ApiProperty()
    city: string;
  @ApiProperty()
    state: string;
  @ApiProperty()
    country: string;
  @ApiProperty()
    postalCode: string;
  @ApiProperty()
    phone: string;
  @ApiProperty()
    isVerified: boolean;
  }
  