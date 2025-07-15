import { Controller, Get, Query } from '@nestjs/common';
import { CategoryService } from './category.service';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  // GET /categories/top-level
  @Get('top-level')
  async getTopLevelCategories() {
    return this.categoryService.getTopLevelCategories();
  }
   // GET /categories/children?parentId=xxxx
  @Get('children')
  async getChildren(@Query('parentId') parentId: string) {
    if (!parentId) {
      return { error: 'parentId query parameter is required' };
    }
    return this.categoryService.getChildrenByParentId(parentId);
  }
}
