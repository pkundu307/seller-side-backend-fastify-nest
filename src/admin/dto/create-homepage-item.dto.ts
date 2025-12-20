import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsJSON, IsOptional, IsString } from 'class-validator';
import { LinkType } from '@prisma/client';

export class CreateHomepageItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiProperty({ enum: LinkType, default: LinkType.NONE })
  @IsEnum(LinkType)
  linkType: LinkType;

  @ApiPropertyOptional({ description: 'A URL, slug, or ID depending on linkType' })
  @IsOptional()
  @IsString()
  linkValue?: string;

  @ApiPropertyOptional({  })
  @IsOptional()
  @IsJSON()
  styleConfig?: string; // Received as string, parsed later

  @ApiPropertyOptional({ description: 'Order of item within the section', default: 0 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  position?: number;
}