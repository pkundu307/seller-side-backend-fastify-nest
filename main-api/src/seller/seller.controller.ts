import { Controller, Get, Param, UseGuards, Req, Query, ForbiddenException, ParseUUIDPipe, NotFoundException, Body, Patch, Res, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SellerService } from './seller.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Your JWT guard
import { UserRequest } from '../auth/auth.types'; // Your custom request type
import { SellerPaginationDto } from './dto/seller-pagination.dto';
import { PrismaService } from '../prisma/prisma.service'; // To check business ownership
import { UpdateSellerOrderDto } from './dto/update-order.dtp';
import { FastifyReply } from 'fastify';
import { CreatePosSaleDto } from './dto/create-pos-sale.dto';
import { SalePaginationDto } from './dto/sale-pagination.dto';
import { GetSalesStatsDto } from './dto/get-sales-stats.dto';
import { GetPosCustomersDto } from './dto/get-pos-customers.dto';
import { UpdatePosSaleDto } from './dto/update-pos-sale.dto';
import { PdfService } from './pdf/pdf.service';
import { DashboardFilterDto } from './dto/dashboard-filter.dto';
import { SellerReplyTicketDto, SellerTicketQueryDto, UpdateTicketStatusDto } from './dto/seller-ticket.dto';

@ApiTags('Seller Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('seller')
export class SellerController {
  constructor(
    private readonly sellerService: SellerService,
    private readonly prisma: PrismaService, // Inject Prisma for ownership check
    private readonly pdfService: PdfService
  ) {}

  // Middleware-like function to verify ownership
  private async verifyBusinessOwnership(userId: string, businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true },
    });
    if (!business) {
      throw new NotFoundException(`Business with ID "${businessId}" not found.`);
    }
    if (business.ownerId !== userId) {
      throw new ForbiddenException('You do not have permission to access this business.');
    }
  }

  @Get(':businessId/orders')
  @ApiOperation({ summary: "Get all orders for one of the seller's businesses" })
  @ApiResponse({ status: 200, description: 'Returns a paginated list of orders and statistics.'})
  async getBusinessOrders(
    @Req() req: UserRequest,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Query() query: SellerPaginationDto,
  ) {
    await this.verifyBusinessOwnership(req.user.id, businessId);
    return this.sellerService.getBusinessOrders(businessId, query);
  }

  @Get(':businessId/orders/:orderId')
  @ApiOperation({ summary: "Get a specific order for one of the seller's businesses" })
  @ApiResponse({ status: 200, description: 'Returns detailed information for a single order.'})
  async getBusinessOrderById(
    @Req() req: UserRequest,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    await this.verifyBusinessOwnership(req.user.id, businessId);
    return this.sellerService.getBusinessOrderById(businessId, orderId);
  }
    @Patch(':businessId/orders/:orderId')
  @ApiOperation({ summary: "Update the status and tracking info of an order" })
  @ApiResponse({ status: 200, description: 'Order updated successfully.'})
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., invalid status transition).'})
  @ApiResponse({ status: 403, description: 'Forbidden.'})
  @ApiResponse({ status: 404, description: 'Order or Business not found.'})
  async updateOrderStatus(
    @Req() req: UserRequest,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() updateDto: UpdateSellerOrderDto,
  ) {
    await this.verifyBusinessOwnership(req.user.id, businessId);
    return this.sellerService.updateOrderStatus(businessId, orderId, updateDto);
  }

 @Get(':businessId/orders/:orderId/shipping-label')
  @ApiOperation({ summary: 'Generate and download a PDF shipping label for an order' })
  @ApiResponse({ status: 200, description: 'Returns the generated PDF file.' })
  @ApiResponse({ status: 400, description: 'Invalid design specified or missing address.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  // --- THIS DECORATOR DOCUMENTS THE NEW QUERY PARAMETER ---
  @ApiQuery({
    name: 'design',
    required: false,
    enum: ['a6', 'pos'],
    description: "The desired label format. Defaults to 'a6' if not provided.",
  })
  async getShippingLabel(
    @Req() req: UserRequest,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    // --- THIS PARAMETER CAPTURES THE QUERY STRING ---
    // Example: /shipping-label?design=pos
    @Query('design') design: 'a6' | 'pos',
    @Res() reply: FastifyReply,
  ) {
    // 1. Security check remains the same
    await this.verifyBusinessOwnership(req.user.id, businessId);
    
    // 2. The 'design' parameter is now passed to the service.
    // If the user doesn't provide it, 'design' will be undefined,
    // and the service's default value ('a6') will be used.
    const pdfBuffer = await this.sellerService.generateShippingLabelPdf(
      businessId,
      orderId,
      
    );

    // 3. Response logic remains the same
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename=shipping-label-${orderId}.pdf`);
    reply.send(pdfBuffer);
  }
@Post(':businessId/sales')
@ApiOperation({ summary: 'Create a new Point-of-Sale (POS) sale for a business' })
async createPosSale(
  @Req() req: UserRequest,
  @Param('businessId', ParseUUIDPipe) businessId: string,
  @Body() dto: CreatePosSaleDto,
) {
  await this.verifyBusinessOwnership(req.user.id, businessId);
  return this.sellerService.createPosSale(businessId, dto);
}

 @Get(':businessId/sales')
  @ApiOperation({ summary: "Get all sales records for one of the seller's businesses" })
  @ApiResponse({ status: 200, description: 'Returns a paginated list of sales.' })
  async getBusinessSales(
    @Req() req: UserRequest,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Query() query: SalePaginationDto,
  ) {
    await this.verifyBusinessOwnership(req.user.id, businessId);
    return this.sellerService.getBusinessSales(businessId, query);
  }

// GET /seller/:businessId/sales/:saleId
@Get(':businessId/sales/:saleId')
@ApiOperation({ summary: 'Get a specific sale by ID' })
async getBusinessSaleById(
  @Req() req: UserRequest,
  @Param('businessId', ParseUUIDPipe) businessId: string,
  @Param('saleId',     ParseUUIDPipe) saleId:     string,
) {
  await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
  return this.sellerService.getBusinessSaleById(businessId, saleId);
}

// PATCH /seller/:businessId/sales/:saleId
@Patch(':businessId/sales/:saleId')
@ApiOperation({ summary: 'Update an existing sale (reverts and re-applies)' })
async updatePosSale(
  @Req() req: UserRequest,
  @Param('businessId', ParseUUIDPipe) businessId: string,
  @Param('saleId',     ParseUUIDPipe) saleId:     string,
  @Body() dto: UpdatePosSaleDto,
) {
  await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
  return this.sellerService.updatePosSale(businessId, saleId, dto);
}

  
 @Get(':businessId/sales/stats')
  @ApiOperation({ summary: 'Get sales statistics and timeline for a dashboard' })
  @ApiResponse({ status: 200, description: 'Returns aggregated sales data.' })
  async getStats(
    @Param('businessId') businessId: string,
    @Query() query: GetSalesStatsDto,
  ) {
    return this.sellerService.getSalesStats(businessId, query);
  }
  
  @Get(':businessId/pos/products')
@ApiOperation({ summary: 'Minified product search for POS dropdown' })
async getPosProducts(
  @Param('businessId', ParseUUIDPipe) businessId: string,
  @Query('search') search?: string, // <--- marked as optional
) {
  return this.sellerService.getPosProducts(businessId, search);
}

@Get(':businessId/customers')
@ApiOperation({ summary: 'Get all POS customers linked to this business' })
async getBusinessCustomers(
  @Param('businessId', ParseUUIDPipe) businessId: string,
  @Query() query: GetPosCustomersDto,
) {
  return this.sellerService.getPosCustomers(businessId, query);
}


  // 2. Download Invoice PDF (Fastify Version)
@Get(':businessId/sales/:saleId/pdf')
  @ApiOperation({ summary: 'Generate PDF Invoice' })
  async generateSalePdf(
    @Req() req: UserRequest,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('saleId', ParseUUIDPipe) saleId: string,
    @Res() res: FastifyReply,
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    const sale = await this.sellerService.getBusinessSaleById(businessId, saleId);

    const buffer = await this.pdfService.generateSaleInvoicePdf(sale);

    res.header('Content-Type', 'application/pdf');
    res.header(
      'Content-Disposition',
      `attachment; filename=Invoice-${sale.invoicePrefix}-${sale.invoiceNo}.pdf`,
    );
    res.send(buffer);
  }

    @Get(':businessId/dashboard/overview')
  @ApiOperation({ summary: 'Get main dashboard stats (Sales, Purchases, Graph, Recent Activity)' })
  async getDashboardOverview(
    @Req() req: UserRequest,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Query() query: DashboardFilterDto,
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.sellerService.getDashboardOverview(businessId, query);
  }

    @Get(':businessId/waitlist/summary')
  @ApiOperation({ summary: 'Seller Analytics: See which products have the most people waiting' })
  async getWaitlistSummary(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Req() req: UserRequest,
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.sellerService.getWaitlistAnalytics(businessId);
  }

    @Get(':businessId/tickets/stats')
  @ApiOperation({ summary: 'Get counts of tickets by status' })
  async getTicketStats(
    @Req() req: UserRequest,
    @Param('businessId', ParseUUIDPipe) businessId: string,
  ) {
    await this.verifyBusinessOwnership(req.user.id, businessId);
    return this.sellerService.getTicketStats(businessId);
  }

  @Get(':businessId/tickets')
  @ApiOperation({ summary: 'Get all tickets for the business with pagination' })
  async getBusinessTickets(
    @Req() req: UserRequest,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Query() query: SellerTicketQueryDto,
  ) {
    await this.verifyBusinessOwnership(req.user.id, businessId);
    return this.sellerService.getBusinessTickets(businessId, query);
  }

  @Get(':businessId/tickets/:ticketId')
  @ApiOperation({ summary: 'Get details and chat history of a specific ticket' })
  async getTicketDetails(
    @Req() req: UserRequest,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
  ) {
    await this.verifyBusinessOwnership(req.user.id, businessId);
    return this.sellerService.getTicketDetails(businessId, ticketId);
  }

  @Post(':businessId/tickets/:ticketId/reply')
  @ApiOperation({ summary: 'Reply to a customer ticket' })
  async replyToTicket(
    @Req() req: UserRequest,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Body() dto: SellerReplyTicketDto,
  ) {
    await this.verifyBusinessOwnership(req.user.id, businessId);
    return this.sellerService.replyToTicket(req.user.id, businessId, ticketId, dto);
  }

  @Patch(':businessId/tickets/:ticketId/status')
  @ApiOperation({ summary: 'Update ticket status (e.g. RESOLVED)' })
  async updateTicketStatus(
    @Req() req: UserRequest,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    await this.verifyBusinessOwnership(req.user.id, businessId);
    return this.sellerService.updateTicketStatus(businessId, ticketId, dto);
  }
}