// src/customer-user/CustomerTicket.controller.ts

// ... existing imports ...
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CreateTicketDto, ReplyTicketDto, UpdateTicketStatusDto } from './dto/ticket.dto';
import { TicketStatus } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRequest } from 'src/auth/auth.types';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CustomerUserService } from './customer-user.service';

@ApiTags('Customer Support Tickets') // Group in Swagger
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customer/tickets') // NEW PREFIX for clean routing
export class CustomerTicketController {
  constructor(private readonly customerUserService: CustomerUserService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new support ticket' })
  async createTicket(@Req() req: UserRequest, @Body() dto: CreateTicketDto) {
    return this.customerUserService.createTicket(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all my tickets (Optional: filter by status)' })
  async getMyTickets(
    @Req() req: UserRequest, 
    @Query('status') status?: TicketStatus
  ) {
    return this.customerUserService.getMyTickets(req.user.id, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get specific ticket details with chat history' })
  async getTicketDetails(
    @Req() req: UserRequest, 
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.customerUserService.getTicketDetails(req.user.id, id);
  }

  @Post(':id/reply')
  @ApiOperation({ summary: 'Reply to a ticket' })
  async replyToTicket(
    @Req() req: UserRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplyTicketDto,
  ) {
    return this.customerUserService.replyToTicket(req.user.id, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update ticket status (e.g., mark as RESOLVED/CLOSED)' })
  async updateTicketStatus(
    @Req() req: UserRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.customerUserService.updateTicketStatus(req.user.id, id, dto.status);
  }

@Get('order/:orderId')
  @ApiOperation({ summary: 'Get all support tickets related to a specific Order ID' })
  async getTicketsByOrder(
    @Req() req: UserRequest,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.customerUserService.getTicketsByOrderId(req.user.id, orderId);
  }
}