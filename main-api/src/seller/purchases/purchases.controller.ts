import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { PurchasePaginationDto } from './dto/purchase-pagination.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('seller/:businessId/purchases')
@UseGuards(JwtAuthGuard)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get()
  getPurchases(
    @Param('businessId') businessId: string,
    @Query() query: PurchasePaginationDto,
  ) {
    return this.purchasesService.findAll(businessId, query);
  }

  @Post()
  createPurchase(
    @Param('businessId') businessId: string,
    @Body() dto: CreatePurchaseDto,
  ) {
    return this.purchasesService.create(businessId, dto);
  }
}
