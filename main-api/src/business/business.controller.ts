import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BusinessService } from './business.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateBusinessDto } from './dto/create-business.dto';
import { FastifyRequest } from 'fastify';

@Controller('business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @UseGuards(JwtAuthGuard)
@Post()
@HttpCode(HttpStatus.CREATED)
async create(@Body() dto: CreateBusinessDto, @Req() req: FastifyRequest) {
  const user = req.user as any;
  return this.businessService.createBusiness(dto, user.id);
}


  @UseGuards(JwtAuthGuard)
  @Get('/mine')
  async getAll(@Req() req: FastifyRequest) {
    const user = req.user as any;
    return this.businessService.getAllBusinesses(user.id);
  }
}
