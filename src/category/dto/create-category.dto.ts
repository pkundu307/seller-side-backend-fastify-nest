import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ description: 'The name of the category', example: 'Electronics' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'The ID of the parent category. Leave empty for a top-level category.',
    example: 1,
    required: false,
  })
  @IsInt()
  @IsOptional()
  parentId?: number;
}