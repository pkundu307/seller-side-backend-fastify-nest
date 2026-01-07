// It's better to have a dedicated controller for attribute-related actions.
// If you don't want a new module, you can add this to categories.controller.ts

import { Controller, Get, Param, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { AttributesService } from './attributes.service'; // You would create this service
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Attributes')
@Controller('attributes')
export class AttributesController {
  constructor(private readonly attributesService: AttributesService) {}

  @Get(':attributeId/options')
  @ApiOperation({ summary: 'Get all predefined options for a specific attribute' })
  async getOptionsForAttribute(@Param('attributeId', ParseIntPipe) attributeId: number) {
    return this.attributesService.getAttributesForCategory(attributeId);
  }
}