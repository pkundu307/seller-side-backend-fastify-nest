import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateStatusDto {
  @ApiProperty({ description: 'The active status to set' })
  @IsBoolean()
  isActive: boolean;
}