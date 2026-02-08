import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ 
    type: 'string',
    example: '5', 
    description: 'Rating from 1 to 5',
  })
  @IsNotEmpty() // ✅ This allows the property through whitelist
  rating: any;

  @ApiPropertyOptional({ 
    type: 'string',
    example: 'Great product!',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ 
    type: 'string',
    example: 'This product exceeded my expectations.',
  })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class UpdateReviewDto extends CreateReviewDto {}
