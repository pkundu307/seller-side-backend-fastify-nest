import { Controller, Get, Post, HttpCode } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HomepageService } from './homepage.service';

@ApiTags('Public - Homepage')
@Controller('homepage') 
export class HomepageController {
  constructor(private readonly homepageService: HomepageService) {}

  @Get()
  @ApiOperation({ summary: 'Get dynamic layout sections (Banners, Sliders)' })
  @ApiResponse({ status: 200, description: 'Returns structured sections.' })
  async getHomepageLayout() {
    return this.homepageService.getHomepage();
  }

  @Get('distributed')
  @ApiOperation({ summary: 'Get products grouped by category (10 items each)' })
  @ApiResponse({ status: 200, description: 'Returns products distributed by category.' })
  async getDistributedProducts() {
    return this.homepageService.getHomepageDistributed();
  }

  @Post('cache/invalidate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Admin: Clear all homepage caches (Layout + Products)' })
  async clearCache() {
    return this.homepageService.invalidateCache();
  }
}