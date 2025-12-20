import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SectionType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsJSON, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CreateHomepageItemDto } from './create-homepage-item.dto';

export class CreateHomepageSectionDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ enum: SectionType })
  @IsEnum(SectionType)
  type: SectionType;

  @ApiPropertyOptional({ })
  @IsOptional()
  @IsJSON()
  styleConfig?: string; // Received as string, parsed later

  @ApiProperty({ type: () => [CreateHomepageItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateHomepageItemDto)
  items: CreateHomepageItemDto[];
}