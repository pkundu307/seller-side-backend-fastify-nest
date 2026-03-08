import { Controller, Get, Post, Body, Param, Delete, UseGuards, Req, Query, ParseUUIDPipe, Inject, forwardRef } from '@nestjs/common';
import { PaymentOutService } from './payment-out.service';
import { CreatePaymentOutDto } from './dto/create-payment-out.dto';
import { PaymentOutPaginationDto } from './dto/create-payment-out.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SellerService } from '../seller.service';

@ApiTags('Seller: Payment Out')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('seller/:businessId/payments/out')
export class PaymentOutController {
  constructor(
    private readonly paymentOutService: PaymentOutService,
    @Inject(forwardRef(() => SellerService))
    private readonly sellerService: SellerService 
  ) {}

  @Post()
  @ApiOperation({ summary: 'Record a payment made to a supplier' })
  async create(@Param('businessId', ParseUUIDPipe) bId: string, @Body() dto: CreatePaymentOutDto, @Req() req: any) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, bId);
    return this.paymentOutService.create(bId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get payment out history' })
  async findAll(@Param('businessId', ParseUUIDPipe) bId: string, @Query() query: PaymentOutPaginationDto, @Req() req: any) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, bId);
    return this.paymentOutService.findAll(bId, query);
  }

  @Get('pending-suppliers')
  @ApiOperation({ summary: 'Get suppliers with outstanding purchase balances' })
  async getPending(@Param('businessId', ParseUUIDPipe) bId: string, @Req() req: any) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, bId);
    return this.paymentOutService.getPendingSuppliers(bId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Void a payment out' })
  async remove(@Param('businessId', ParseUUIDPipe) bId: string, @Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, bId);
    return this.paymentOutService.remove(bId, id);
  }
}