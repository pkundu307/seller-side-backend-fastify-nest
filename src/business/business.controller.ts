import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { BusinessService } from './business.service';
import { CreateBusinessDto } from './dto/business.dto';
import { AuthGuard } from '@nestjs/passport';

import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('business')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new business' })
  async createBusiness(@Req() req, @Body() dto: CreateBusinessDto) {
    const ownerId = req.user.id; // Comes from JWT payload
    console.log('====================================');
    console.log(req.user.id);
    console.log('====================================');
    return this.businessService.createBusiness(dto, ownerId);
  }

  

  @Get('mine')
  @ApiOperation({ summary: 'Get businesses owned by the logged-in user' })
  async getMyBusinesses(@Req() req) {
    const ownerId = req.user.sub;
    return this.businessService.getMyBusinesses(ownerId);
  }

  
}
