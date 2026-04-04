import {
  Body, Controller, Delete, Get, Param, Patch,
  Post, Query, Req, UseGuards, ParseUUIDPipe, DefaultValuePipe,
  ParseIntPipe, Res,
} from '@nestjs/common';
import { QuotationService }      from './quotation.service';
import { JwtAuthGuard }          from 'src/auth/jwt-auth.guard';
import { CreateQuotationDto }    from './dto/create-quotation.dto';
import { UpdateQuotationDto }    from './dto/update-quotation.dto';
import { ConvertQuotationDto }   from './dto/convert-quotation.dto';
import { ApiOperation, ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { QuotationStatus }       from '@prisma/client';
import { PdfService } from '../pdf/pdf.service';
import { FastifyReply }          from 'fastify';

@ApiTags('Seller Quotations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('seller/:businessId/quotations')
export class QuotationController {
  constructor(
    private readonly quotationService: QuotationService,
    private readonly pdfService:       PdfService,
  ) {}

  // POST /seller/:businessId/quotations
  @Post()
  @ApiOperation({ summary: 'Create a new quotation' })
  create(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: CreateQuotationDto,
    @Req() req: any,
  ) {
    return this.quotationService.create(businessId, req.user.id, dto);
  }

  // GET /seller/:businessId/quotations?page=1&limit=10&status=PENDING
  @Get()
  @ApiOperation({ summary: 'Get all quotations with pagination' })
  @ApiQuery({ name: 'page',   required: false, type: Number })
  @ApiQuery({ name: 'limit',  required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: QuotationStatus })
  findAll(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    // DefaultValuePipe prevents ParseIntPipe crash when param is missing
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page:  number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: QuotationStatus,
  ) {
    return this.quotationService.findAll(businessId, page, limit, status);
  }

  // GET /seller/:businessId/quotations/:id
  @Get(':id')
  @ApiOperation({ summary: 'Get a single quotation by ID' })
  findOne(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.quotationService.findOne(businessId, id);
  }

  // GET /seller/:businessId/quotations/:id/history
  @Get(':id/history')
  @ApiOperation({ summary: 'Get activity history for a quotation' })
  getHistory(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.quotationService.getHistory(businessId, id);
  }

  // GET /seller/:businessId/quotations/:id/pdf
  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download quotation as PDF' })
  async downloadPdf(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: FastifyReply,
  ) {
    const quotation = await this.quotationService.findOneWithBusiness(businessId, id);
    const buffer    = await this.pdfService.generateQuotationPdf(quotation);

    res.header('Content-Type',        'application/pdf');
    res.header('Content-Disposition', `attachment; filename="${quotation.quotationNo}.pdf"`);
    res.header('Content-Length',      buffer.length.toString());
    res.send(buffer);
  }

  // PATCH /seller/:businessId/quotations/:id
  @Patch(':id')
  @ApiOperation({ summary: 'Update quotation details' })
  update(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuotationDto,
    @Req() req: any,
  ) {
    return this.quotationService.update(businessId, req.user.id, id, dto);
  }

  // DELETE /seller/:businessId/quotations/:id
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a quotation (only if not converted)' })
  remove(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    return this.quotationService.remove(businessId, req.user.id, id);
  }

  // POST /seller/:businessId/quotations/:id/convert
  @Post(':id/convert')
  @ApiOperation({ summary: 'Convert quotation to a finalized sale' })
  convertToSale(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConvertQuotationDto,
    @Req() req: any,
  ) {
    return this.quotationService.convertToSale(businessId, req.user.id, id, dto);
  }
}
