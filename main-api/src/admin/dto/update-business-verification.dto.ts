import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateBusinessVerificationDto {
  @ApiProperty({
    description: 'The new verification status of the business.',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  isVerified: boolean;
}