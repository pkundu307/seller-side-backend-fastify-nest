// src/seller/reports/gstr1/gstr1.controller.ts

import {
  Controller, Get, Param, ParseUUIDPipe,
  Query, Req, UseGuards, Inject, forwardRef,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UserRequest } from 'src/auth/auth.types';
import { SellerService } from '../../seller.service';
import { Gstr1Service } from './gstr1.service';
import { Gstr1QueryDto } from './dto/gstr1-query.dto';

@ApiTags('GSTR-1')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('seller/:businessId/reports/gstr1')
export class Gstr1Controller {
  constructor(
    private readonly gstr1Service: Gstr1Service,
    @Inject(forwardRef(() => SellerService))
    private readonly sellerService: SellerService,
  ) {}

  @Get('summary')
  @ApiOperation({ summary: 'Full GSTR-1 — all sections in one response' })
  async getSummary(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Query() query: Gstr1QueryDto,
    @Req() req: UserRequest,
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.gstr1Service.getGstr1Summary(businessId, query);
  }

  @Get('b2b')
  @ApiOperation({ summary: 'B2B — Invoices to registered buyers (with GSTIN)' })
  async getB2B(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Query() query: Gstr1QueryDto,
    @Req() req: UserRequest,
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.gstr1Service.getB2B(businessId, query);
  }

  @Get('b2cl')
  @ApiOperation({ summary: 'B2CL — Large unregistered interstate invoices (> ₹2.5L)' })
  async getB2CL(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Query() query: Gstr1QueryDto,
    @Req() req: UserRequest,
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.gstr1Service.getB2CL(businessId, query);
  }

  @Get('b2cs')
  @ApiOperation({ summary: 'B2CS — Small/intrastate unregistered invoices' })
  async getB2CS(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Query() query: Gstr1QueryDto,
    @Req() req: UserRequest,
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.gstr1Service.getB2CS(businessId, query);
  }

  @Get('cdnr')
  @ApiOperation({ summary: 'CDNR — Credit/Debit notes to registered buyers' })
  async getCDNR(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Query() query: Gstr1QueryDto,
    @Req() req: UserRequest,
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.gstr1Service.getCDNR(businessId, query);
  }

  @Get('cdnur')
  @ApiOperation({ summary: 'CDNUR — Credit/Debit notes to unregistered buyers' })
  async getCDNUR(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Query() query: Gstr1QueryDto,
    @Req() req: UserRequest,
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.gstr1Service.getCDNUR(businessId, query);
  }

  @Get('exemp')
  @ApiOperation({ summary: 'EXEMP — Nil rated / Exempted / Non-GST supplies' })
  async getEXEMP(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Query() query: Gstr1QueryDto,
    @Req() req: UserRequest,
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.gstr1Service.getEXEMP(businessId, query);
  }

  @Get('hsn-b2b')
  @ApiOperation({ summary: 'HSN(B2B) — HSN summary for registered buyer sales' })
  async getHsnB2B(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Query() query: Gstr1QueryDto,
    @Req() req: UserRequest,
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.gstr1Service.getHSN(businessId, query, 'B2B');
  }

  @Get('hsn-b2c')
  @ApiOperation({ summary: 'HSN(B2C) — HSN summary for unregistered buyer sales' })
  async getHsnB2C(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Query() query: Gstr1QueryDto,
    @Req() req: UserRequest,
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.gstr1Service.getHSN(businessId, query, 'B2C');
  }

  @Get('documents')
  @ApiOperation({ summary: 'Documents Issued — Invoice / CDN count & cancellation summary' })
  async getDocs(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Query() query: Gstr1QueryDto,
    @Req() req: UserRequest,
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.gstr1Service.getDocumentsIssued(businessId, query);
  }
}
