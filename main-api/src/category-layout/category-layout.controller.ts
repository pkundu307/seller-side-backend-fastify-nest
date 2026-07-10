import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpException,
  HttpStatus,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CategoryLayoutService, CategoryLayoutType } from './category-layout.service';

@ApiTags('Category Layout - Public')
@Controller('categories')
export class CategoryLayoutController {
  constructor(private readonly layoutService: CategoryLayoutService) {}

  @Get(':idOrSlug/layouts')
  @ApiOperation({ summary: 'Get all layouts for a category (accepts ID or slug)' })
  @ApiResponse({ status: 200, description: 'Returns all layouts ordered by position' })
  async getAllCategoryLayouts(@Param('idOrSlug') idOrSlug: string) {
    const layouts = await this.layoutService.getCategoryLayouts(idOrSlug);
    return { success: true, data: layouts };
  }

  @Post('cache/invalidate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Admin: Clear category layout cache' })
  async invalidateCache(@Query('categorySlug') categorySlug?: string) {
    return this.layoutService.invalidateCache(categorySlug);
  }
}

@ApiTags('Admin - Category Layout Management')
@Controller('admin/categories')
export class AdminCategoryLayoutController {
  constructor(private readonly layoutService: CategoryLayoutService) {}

  @Get(':slug/layouts')
  @ApiOperation({ summary: 'Get all layouts for a specific category' })
  async getAllCategoryLayoutsAdmin(@Param('slug') slug: string) {
    const layouts = await this.layoutService.getCategoryLayouts(slug);
    return { success: true, data: layouts };
  }

  @Post(':slug/layout')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new layout section' })
  async createLayout(
    @Param('slug') slug: string,
    @Body() data: any,
  ) {
    const layout = await this.layoutService.createLayout({
      ...data,
      categorySlug: slug,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    });
    return { success: true, data: layout };
  }

  @Patch(':slug/layout/:id')
  @ApiOperation({ summary: 'Update a specific layout section by ID' })
  async updateLayout(
    @Param('slug') slug: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: any,
  ) {
    const layout = await this.layoutService.updateLayout(id, {
      ...data,
      categorySlug: slug, // Keep for cache invalidation
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    });
    return { success: true, data: layout };
  }

  @Delete(':slug/layout/:id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete a specific layout section by ID' })
  async deleteLayout(
    @Param('slug') slug: string,
    @Param('id', ParseIntPipe) id: number
  ) {
    const result = await this.layoutService.deleteLayout(id);
    return { success: true, message: result.message };
  }

  @Patch(':slug/layouts/reorder')
  @ApiOperation({ summary: 'Bulk update the display order of layout sections' })
  async reorderLayouts(
    @Param('slug') slug: string,
    @Body() positions: { id: number, position: number }[]
  ) {
    const data = await this.layoutService.updateLayoutPositions(slug, positions);
    return { success: true, data };
  }
}