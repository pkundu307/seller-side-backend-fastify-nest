// src/categories/dto/create-attribute.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
  ArrayNotEmpty,
  IsInt,
} from 'class-validator';

// DTO for a single option (e.g., "Red", "Large")
class OptionInputDto {
  @ApiProperty({ example: 'Red', description: 'The value of the attribute option' })
  @IsString()
  @IsNotEmpty()
  value: string;
}

// DTO for a single attribute within the batch (e.g., "Color" with its options)
class AttributeInputDto {
  @ApiProperty({ example: 'Color', description: 'The name of the attribute' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ type: [OptionInputDto], description: 'List of options for this attribute' })
  @IsArray()
  @ArrayNotEmpty() // Ensure the options array is not empty
  @ValidateNested({ each: true }) // Validate each object in the array
  @Type(() => OptionInputDto) // Required for class-validator to use the DTO
  options: OptionInputDto[];
}

// This is the main DTO for the entire request body
export class AddAttributesBatchDto {
   @ApiProperty({ example: 101, description: 'The ID of the child-most category' })
  @IsInt() // Validate that it's an integer
  @IsNotEmpty()
  categoryId: number;

  @ApiProperty({ type: [AttributeInputDto], description: 'List of attributes with options' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeInputDto)
  attributes: AttributeInputDto[];

  //gst rate
  // @ApiProperty({ example: 18, description: 'The GST rate for the category' })
  // @IsNumber()
  // @IsNotEmpty()
  // gstRate: number;
}

export class CreateAttributeOptionDto {
  @ApiProperty({ example: 'XL', description: 'The value of the option (e.g., Red, XL)' })
  @IsString()
  @IsNotEmpty()
  value: string;
}