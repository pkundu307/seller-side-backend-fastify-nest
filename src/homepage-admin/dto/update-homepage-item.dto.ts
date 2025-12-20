import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LinkType } from '@prisma/client';
import { IsEnum, IsJSON, IsOptional, IsString } from 'class-validator';

export class UpdateHomepageItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional({ enum: LinkType })
  @IsOptional()
  @IsEnum(LinkType)
  linkType?: LinkType;

  @ApiPropertyOptional({ description: 'A URL, slug, or ID depending on linkType' })
  @IsOptional()
  @IsString()
  linkValue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsJSON()
  styleConfig?: string;
}