// src/seller/party/party.controller.ts
import {
  Controller, Get, Post, Patch,
  Delete, Param, Body, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard }   from 'src/auth/jwt-auth.guard';
import { PartyService }   from './party.service';
import { CreatePartyDto } from './dto/create-party.dto';
import { UpdatePartyDto } from './dto/update-party.dto';
import { PartyQueryDto }  from './dto/party-query.dto';

@ApiTags('Seller Parties')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('seller/:businessId/parties')
export class PartyController {
  constructor(private readonly partyService: PartyService) {}

  // POST /seller/:businessId/parties
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new party (customer/supplier)' })
  create(
    @Param('businessId') businessId: string,
    @Body() dto: CreatePartyDto,
  ) {
    return this.partyService.create(businessId, dto);
  }

  // GET /seller/:businessId/parties
  @Get()
  @ApiOperation({ summary: 'Get all parties with pagination and filters' })
  findAll(
    @Param('businessId') businessId: string,
    @Query() query: PartyQueryDto,
  ) {
    return this.partyService.findAll(businessId, query);
  }

  // GET /seller/:businessId/parties/:id
  @Get(':id')
  @ApiOperation({ summary: 'Get a single party by ID' })
  findOne(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.partyService.findOne(businessId, id);
  }

  // PATCH /seller/:businessId/parties/:id
  @Patch(':id')
  @ApiOperation({ summary: 'Update a party' })
  update(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePartyDto,
  ) {
    return this.partyService.update(businessId, id, dto);
  }

  // DELETE /seller/:businessId/parties/:id
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a party (blocked if balance exists)' })
  remove(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.partyService.remove(businessId, id);
  }
}
