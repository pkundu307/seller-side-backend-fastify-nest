import {
  Controller, Param, Post, UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProductsService } from './product.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':businessId')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('businessId') businessId: string,
    @Req() req: FastifyRequest,           // multipart/form‑data
  ) {
    const user = req.user as any; 
    console.log(user);
            // { id, email, role }
    return this.service.handleMultipart(req, businessId, user.id);
  }
}
