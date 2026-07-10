// src/category-layout/category-layout.module.ts
import { Module } from '@nestjs/common';
import { CategoryLayoutService } from './category-layout.service';
import { CategoryLayoutController, AdminCategoryLayoutController } from './category-layout.controller';

@Module({
  providers: [CategoryLayoutService],
  controllers: [CategoryLayoutController, AdminCategoryLayoutController],
  exports: [CategoryLayoutService],
})
export class CategoryLayoutModule {}
