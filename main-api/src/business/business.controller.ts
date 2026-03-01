import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Patch,
  Param,
} from '@nestjs/common';
import { BusinessService } from './business.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateBusinessDto } from './dto/create-business.dto';
import { FastifyRequest } from 'fastify';
import { UpdateBusinessDto } from './dto/update-business.dto';

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

@UseGuards(JwtAuthGuard)
@Patch('settingpage/:id')
async update(
  @Param('id') businessId: string,
  @Body() dto: UpdateBusinessDto,
  @Req() req: FastifyRequest
) {
  const user = req.user as any;
  
  // Handling Files in Fastify is slightly different than Express.
  // Assuming you have a way to extract buffers. 
  // If using standard @fastify/multipart:
  const parts = req.parts(); 
  let logoBuffer, bannerBuffer, signatureBuffer;
  
  // Logic to extract files from multipart request in Fastify
  // This part depends heavily on your main.ts multipart configuration.
  // Ideally, use a dedicated Interceptor for Fastify file handling to get clean Buffers.
  
  // Simplified call:
  return this.businessService.updateBusiness(businessId, user.id, dto, {
    logo: logoBuffer,
    banner: bannerBuffer,
    signature: signatureBuffer
  });
}
 @UseGuards(JwtAuthGuard)
  @Get('settingpage/:id')
  async getBusiness(@Param('id') id: string, @Req() req: FastifyRequest) {
    const user = req.user as any;
    return this.businessService.getBusinessForSettingById(id, user.id);
  }
}
