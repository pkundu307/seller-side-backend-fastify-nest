import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class CreateCategoriesDto {
  @ApiProperty({
    description: 'An array of names for the new categories to be created.',
    type: [String],
    example: ['Occasions', 'Themes', 'Graphics'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsString({ each: true })
  categoryNames: string[];
}