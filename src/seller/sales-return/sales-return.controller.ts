import { 
  Controller, Get, Post, Body, Param, Delete, 
  UseGuards, Req, Query, ParseUUIDPipe 
} from '@nestjs/common';
import { SalesReturnService } from './sales-return.service';
import { CreateSalesReturnDto } from './dto/create-sales-return.dto';
import { SalesReturnPaginationDto } from './dto/sales-return-pagination.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRequest } from 'src/auth/auth.types';
import { SellerService } from '../seller.service';
@ApiTags('Seller Sales Return (Credit Note)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('seller/:businessId/sales-return')
export class SalesReturnController {
  constructor(
    private readonly salesReturnService: SalesReturnService,
    private readonly sellerService: SellerService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a Sales Return (Credit Note)' })
  async create(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: CreateSalesReturnDto,
    @Req() req: UserRequest
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.salesReturnService.create(businessId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all credit notes' })
  async findAll(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Query() query: SalesReturnPaginationDto,
    @Req() req: UserRequest
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.salesReturnService.findAll(businessId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a credit note' })
  async findOne(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: UserRequest
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.salesReturnService.findOne(businessId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel/Void a Credit Note' })
  async remove(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: UserRequest
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.salesReturnService.remove(businessId, id);
  }

    @Get('invoices-by-customer')
  @ApiOperation({ summary: 'Get invoices for a customer to create a return' })
  async getInvoicesByCustomer(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Query('customerId', ParseUUIDPipe) customerId: string,
    @Req() req: UserRequest
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.salesReturnService.getInvoicesByCustomer(businessId, customerId);
  }
}