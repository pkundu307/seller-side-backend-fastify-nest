import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateCustomizationImageDto {
  @ApiProperty({
    description: 'The active state of the image. Inactive images will not be shown to users.',
    example: false,
  })
  @IsBoolean()
  active: boolean;
}