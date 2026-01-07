import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsUrl, IsOptional, IsInt, Min, Matches } from 'class-validator';

export class CreateBannerDto {
  @ApiProperty({
    description: 'The main title of the banner, e.g., "HANDBAGS"',
    example: 'SUMMER SALE',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Optional discount text, e.g., "50-70% Off"',
    example: 'Up to 60% Off',
  })
  @IsString()
  @IsOptional()
  discountText?: string;

  @ApiProperty({
    description: 'The URL to navigate to on click',
    example: '/category/sneakers',
  })
  @IsString()
  targetUrl: string;

  @ApiPropertyOptional({
    description: 'The order of the banner in the carousel. Lower numbers appear first.',
    example: 0,
    default: 0,
  })
  @Transform(({ value }) => parseInt(value, 10)) // Transform string from form-data to number
  @IsInt()
  @Min(0)
  @IsOptional()
  position?: number = 0;
}