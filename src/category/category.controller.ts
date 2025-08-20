// src/categories/categories.controller.ts

import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CreateCategoryDto } from './dto/create-category.dto';
import { AddAttributesBatchDto } from './dto/create-attribute.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard'; // Adjust path if needed

@ApiTags('Categories')
@Controller('categories')
export class CategoryController { // Renamed for consistency
  constructor(private readonly categoriesService: CategoryService) {}

  // --- CATEGORY ENDPOINTS ---

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: 201, description: 'Category created successfully.' })
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.createCategory(createCategoryDto);
  }

  @Get('top-level')
  @ApiOperation({ summary: 'Get all top-level (parent) categories' })
  getTopLevelCategories() {
    return this.categoriesService.getTopLevelCategories();
  }

  @Get('children')
  @ApiOperation({ summary: 'Get all direct children of a specific category' })
  @ApiQuery({ name: 'parentId', required: true, description: 'The ID of the parent category' })
  getChildren(@Query('parentId', ParseIntPipe) parentId: number) {
    return this.categoriesService.getChildrenByParentId(parentId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search for categories and get their full path' })
  @ApiQuery({ name: 'q', required: true, description: 'The search term' })
  searchCategories(@Query('q') query: string) {
    return this.categoriesService.searchCategories(query);
  }

  @Post('attributes/batch') // Using a more descriptive path like 'batch' is good practice
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add multiple attributes to a child-most category in a batch' })
  @ApiResponse({ status: 201, description: 'The attributes have been successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., not a child-most category, invalid data).' })
  addAttributes(@Body() dto: AddAttributesBatchDto) {
    return this.categoriesService.addAttributesToCategoryBatch(dto);
  }


  @Get(':categoryId/attributes')
  @ApiOperation({ summary: 'Get all attributes and options for a specific category by its ID' })
  @ApiResponse({ status: 200, description: 'Returns the list of attributes for the category.' })
  @ApiResponse({ status: 404, description: 'Category with the specified ID was not found.' })
  getAttributesByCategoryId(
    // The ParseIntPipe handles validation and conversion for us
    @Param('categoryId', ParseIntPipe) categoryId: number
  ) {
    // Call the new service method
    return this.categoriesService.getAttributesByCategoryId(categoryId);
  }
}