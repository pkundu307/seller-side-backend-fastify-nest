import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsInt, Min, IsUUID, IsString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for filtering products in the Admin panel
 */
export class AdminProductFilterDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number) // Converts string "1" to number 1
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter products belonging to a specific business' })
  @IsOptional()
  @IsUUID()
  businessId?: string;

  @ApiPropertyOptional({ description: 'Filter by current live status' })
  @IsOptional()
  @Type(() => Boolean) // Converts string "true" to boolean true
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ 
    description: 'If true, fetches products that are Featured:true but Published:false' 
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  needsVerification?: boolean;
}

/**
 * DTO for updating the status and providing feedback to the seller
 */
export class UpdateProductPublishStatusDto {
  @ApiPropertyOptional({ description: 'The new publication status' })
  @Type(() => Boolean)
  @IsBoolean()
  isPublished: boolean;

  @ApiPropertyOptional({ 
    description: 'Message to the seller. Use this to explain rejections or requested changes.' 
  })
  @IsOptional()
  @IsString()
  remarks?: string;
}