import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CancelOrderDto {
  @ApiProperty({
    description: 'The reason for cancelling the order.',
    example: 'Ordered by mistake',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason: string;
}