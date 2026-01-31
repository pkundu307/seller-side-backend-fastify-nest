import { Body, Controller, Delete, Get, Header, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Req, Res, UseGuards, forwardRef } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRequest } from 'src/auth/auth.types';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { SellerService } from '../seller.service';
import { CreateProformaInvoiceDto } from './dto/create-proforma-invoice.dto';
import { ProformaInvoicePaginationDto } from './dto/proforma-invoice-pagination.dto';
import { UpdateProformaInvoiceDto } from './dto/update-proforma-invoice.dto';
import { ProformaInvoiceService } from './proforma-invoice.service';
import { FastifyReply } from 'fastify';

@ApiTags('Seller Proforma Invoice')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('seller/:businessId/proforma-invoices')
export class ProformaInvoiceController {
  constructor(
    private readonly proformaInvoiceService: ProformaInvoiceService,
    @Inject(forwardRef(() => SellerService))
    private readonly sellerService: SellerService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new Proforma Invoice' })
  async create(@Param('businessId', ParseUUIDPipe) businessId: string, @Body() dto: CreateProformaInvoiceDto, @Req() req: UserRequest) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.proformaInvoiceService.create(businessId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all Proforma Invoices' })
  async findAll(@Param('businessId', ParseUUIDPipe) businessId: string, @Query() query: ProformaInvoicePaginationDto, @Req() req: UserRequest) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.proformaInvoiceService.findAll(businessId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific Proforma Invoice' })
  async findOne(@Param('businessId', ParseUUIDPipe) businessId: string, @Param('id', ParseUUIDPipe) id: string, @Req() req: UserRequest) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.proformaInvoiceService.findOne(businessId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a Proforma Invoice' })
  async update(@Param('businessId', ParseUUIDPipe) businessId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProformaInvoiceDto, @Req() req: UserRequest) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.proformaInvoiceService.update(businessId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a Proforma Invoice' })
  async remove(@Param('businessId', ParseUUIDPipe) businessId: string, @Param('id', ParseUUIDPipe) id: string, @Req() req: UserRequest) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.proformaInvoiceService.remove(businessId, id);
  }

  // @Get(':id/pdf')
  // @ApiOperation({ summary: 'Download Proforma Invoice as PDF' })
  // async getPdf(
  //   @Param('businessId', ParseUUIDPipe) businessId: string, 
  //   @Param('id', ParseUUIDPipe) id: string, 
  //   @Req() req: UserRequest,
  //   @Res() reply: FastifyReply
  // ) {
  //   await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
  //   const pdfBuffer = await this.proformaInvoiceService.generatePdf(businessId, id);
    
  //   reply.header('Content-Type', 'application/pdf');
  //   reply.header('Content-Disposition', `attachment; filename=proforma-invoice-${id}.pdf`);
  //   reply.send(pdfBuffer);
  // }

  @Post(':id/convert')
  @ApiOperation({ summary: 'Convert Proforma Invoice to a Sale (Tax Invoice)' })
  async convertToSale(@Param('businessId', ParseUUIDPipe) businessId: string, @Param('id', ParseUUIDPipe) id: string, @Req() req: UserRequest) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.proformaInvoiceService.convertToSale(businessId, id, req.user.id);
  }
}