import { 
  Controller, Get, Post, Body, Patch, Param, Delete, 
  UseGuards, Req, Query, ParseUUIDPipe, 
  Inject, forwardRef // <--- 1. Import these
} from '@nestjs/common';
import { PaymentInService } from './payment-in.service';
import { CreatePaymentInDto } from './dto/create-payment-in.dto';
import { UpdatePaymentInDto } from './dto/update-payment-in.dto';
import { PaymentInPaginationDto } from './dto/payment-in-pagination.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRequest } from 'src/auth/auth.types';
import { SellerService } from '../seller.service';

@ApiTags('Seller Payment In')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('seller/:businessId/payments/in')
export class PaymentInController {
  constructor(
    private readonly paymentInService: PaymentInService,
    // 2. Apply the Inject decorator here to handle the circular dependency
    @Inject(forwardRef(() => SellerService))
    private readonly sellerService: SellerService 
  ) {}

  @Post()
  @ApiOperation({ summary: 'Record a payment received from customer' })
  async create(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: CreatePaymentInDto,
    @Req() req: UserRequest
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.paymentInService.create(businessId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get payment history' })
  async findAll(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Query() query: PaymentInPaginationDto,
    @Req() req: UserRequest
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.paymentInService.findAll(businessId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single payment details' })
  async findOne(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: UserRequest
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.paymentInService.findOne(businessId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update payment notes or date' })
  async update(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentInDto,
    @Req() req: UserRequest
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.paymentInService.update(businessId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete/Void a payment' })
  async remove(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: UserRequest
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.paymentInService.remove(businessId, id);
  }

  @Get('pending-customers')
  @ApiOperation({ summary: 'Get customers with outstanding invoice balances' })
  async getPendingCustomers(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Req() req: UserRequest
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.paymentInService.getPendingCustomers(businessId);
  }
}