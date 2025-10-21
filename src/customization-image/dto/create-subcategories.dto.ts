import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, ArrayNotEmpty, IsArray, IsString, IsUUID } from 'class-validator';

export class CreateSubCategoriesDto {
  @ApiProperty({
    description: 'The ID of the parent category.',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  @IsString()
  @IsUUID()
  categoryId: string;

  @ApiProperty({
    description: 'An array of names for the new subcategories to be created.',
    type: [String],
    example: ['Birthday', 'Anniversary', 'Wedding'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsString({ each: true })
  subCategoryNames: string[];
}