// main-api/src/admin/dto/create-banner.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateBannerDto {
  @ApiProperty({
    description: 'The URL to navigate to on click',
    example: '/category/sneakers',
  })
  @IsString()
  targetUrl: string;
}