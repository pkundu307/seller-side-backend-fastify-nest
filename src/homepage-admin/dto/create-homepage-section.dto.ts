import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SectionType } from '@prisma/client';
import { IsEnum, IsJSON, IsOptional, IsString } from 'class-validator';

export class CreateHomepageSectionDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ enum: SectionType })
  @IsEnum(SectionType)
  type: SectionType;
  
  @ApiPropertyOptional({ description: 'Optional subtitle for the section' })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsJSON()
  styleConfig?: string;
}