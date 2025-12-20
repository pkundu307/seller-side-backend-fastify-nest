import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HomepageService } from 'src/homepage/homepage.service';

@ApiTags('Public - Homepage')
@Controller('homepage') // Public endpoint, e.g., /api/homepage
export class HomepageController {
  constructor(private readonly homepageService: HomepageService) {}

  @Get()
  @ApiOperation({ summary: 'Get the dynamic layout and content for the public homepage' })
  @ApiResponse({ status: 200, description: 'Returns the structured homepage layout.' })
  getHomepageLayout() {
    return this.homepageService.getHomepage();
  }
}