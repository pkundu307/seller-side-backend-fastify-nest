import { Controller, Get } from '@nestjs/common';
import { BannersService } from './banner.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Banners (Public)') // A new tag for Swagger UI
@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get() // This maps to GET /banners
  @ApiOperation({ summary: 'Get all active promotional banners' })
  @ApiResponse({
    status: 200,
    description: 'Returns an array of active promotional banners, ordered by position.',
  })
  findAllActiveBanners() {
    return this.bannersService.findAllActive();
  }
}