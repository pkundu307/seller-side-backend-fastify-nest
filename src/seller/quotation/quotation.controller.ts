import { 
  Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards, ParseUUIDPipe, ParseIntPipe 
} from '@nestjs/common';
import { QuotationService } from './quotation.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { ConvertQuotationDto } from './dto/convert-quotation.dto';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { QuotationStatus } from '@prisma/client';

@ApiTags('Seller Quotations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('seller/:businessId/quotations')
export class QuotationController {
  constructor(private readonly quotationService: QuotationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new quotation' })
  create(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: CreateQuotationDto,
    @Req() req: any
  ) {
    return this.quotationService.create(businessId, req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all quotations with pagination' })
  findAll(
  @Param('businessId', ParseUUIDPipe) businessId: string,
  @Query('page', ParseIntPipe) page = 1,
  @Query('limit', ParseIntPipe) limit = 10,
  @Query('status') status?: QuotationStatus,
  ) {
    console.log(businessId);
      console.log("Current Business ID:", businessId);

    return this.quotationService.findAll(businessId, page, limit, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get quotation details' })
  findOne(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.quotationService.findOne(businessId, id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get modification history of a quotation' })
  getHistory(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.quotationService.getHistory(businessId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update quotation' })
  update(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuotationDto,
    @Req() req: any
  ) {
    return this.quotationService.update(businessId, req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a quotation' })
  remove(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any
  ) {
    return this.quotationService.remove(businessId, req.user.id, id);
  }

  @Post(':id/convert')
  @ApiOperation({ summary: 'Convert a quotation into a verified Sale' })
  convertToSale(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConvertQuotationDto,
    @Req() req: any
  ) {
    return this.quotationService.convertToSale(businessId, req.user.id, id, dto);
  }
}