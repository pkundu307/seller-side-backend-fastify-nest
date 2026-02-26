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
  Delete,
  Patch,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CreateCategoryDto } from './dto/create-category.dto';
import { AddAttributesBatchDto, CreateAttributeOptionDto } from './dto/create-attribute.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard'; // Adjust path if needed
import { UpdateCategoryDto } from './dto/update-category.dto';

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
    console.log(createCategoryDto);
    
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




   @Get('tree')
  @ApiOperation({ summary: 'Get all categories as a nested tree structure' })
  @ApiResponse({ status: 200, description: 'Returns the complete category tree.' })
  getAllCategoriesAsTree() {
    // This endpoint is public and cached, so no auth guard is needed.
    return this.categoriesService.getAllCategoriesAsTree();
  }

  @Get('admin/tree')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Fetch full category tree with attributes and GST rates' })
  getAdminTree() {
    return this.categoriesService.getAdminCategoryTree();
  }

  @Post('attributes/:attributeId/options')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Add a new value/option to an existing attribute' })
  addAttributeOption(
    @Param('attributeId', ParseIntPipe) attributeId: number,
    @Body() dto: CreateAttributeOptionDto
  ) {
    return this.categoriesService.addAttributeOption(attributeId, dto);
  }

  @Delete('attributes/options/:optionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Delete a specific attribute option' })
  deleteAttributeOption(@Param('optionId', ParseIntPipe) optionId: number) {
    return this.categoriesService.deleteAttributeOption(optionId);
  }

  @Delete('attributes/:attributeId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Delete an entire attribute and its options' })
  deleteAttribute(@Param('attributeId', ParseIntPipe) attributeId: number) {
    return this.categoriesService.deleteAttribute(attributeId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Delete Category (Recursively deletes subcategories and attributes)' })
  @ApiResponse({ status: 200, description: 'Category tree deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete if products are attached' })
  deleteCategory(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.deleteCategory(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard) // Assuming only admins can update
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category details (Name, GST, Parent, etc.)' })
  @ApiResponse({ status: 200, description: 'Category updated successfully.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  async updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.updateCategory(id, dto);
  }
}