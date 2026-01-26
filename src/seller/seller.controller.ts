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
import { PdfService } from './pdf.service';
import { DashboardFilterDto } from './dto/dashboard-filter.dto';

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

  @Get(':businessId/sales/:saleId')
  @ApiOperation({ summary: "Get a specific sale record for one of the seller's businesses" })
  @ApiResponse({ status: 200, description: 'Returns detailed information for a single sale.' })
  @ApiResponse({ status: 404, description: 'Sale not found or does not belong to the seller.' })
  async getBusinessSaleById(
    @Req() req: UserRequest,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('saleId', ParseUUIDPipe) saleId: string,
  ) {
    await this.verifyBusinessOwnership(req.user.id, businessId);
    return this.sellerService.getBusinessSaleById(businessId, saleId);
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
 @Patch(':businessId/sales/:saleId')
  @ApiOperation({ summary: 'Update an existing sale (Reverts and Re-applies)' })
  async updatePosSale(
    @Req() req: UserRequest,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('saleId', ParseUUIDPipe) saleId: string,
    @Body() dto: UpdatePosSaleDto,
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.sellerService.updatePosSale(businessId, saleId, dto);
  }

  // 2. Download Invoice PDF (Fastify Version)
   @Get(':businessId/sales/:saleId/pdf')
  @ApiOperation({ summary: 'Generate PDF Invoice for a Sale' })
  async generateSalePdf(
    @Req() req: UserRequest,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('saleId', ParseUUIDPipe) saleId: string,
    @Res() res: FastifyReply,
  ) {
    // 1. Security Check
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);

    // 2. Fetch Data (Includes Business Info now)
    const sale = await this.sellerService.getBusinessSaleById(businessId, saleId);

    // 3. Generate PDF
    // Cast sale to 'any' if TypeScript complains about strict type matching 
    // or ensure getBusinessSaleById return type matches FullSale
    const buffer = await this.pdfService.generateSaleInvoicePdf(sale as any);

    // 4. Send Response
    res.header('Content-Type', 'application/pdf');
    res.header(
      'Content-Disposition',
      `attachment; filename=Invoice-${sale.invoicePrefix}-${sale.invoiceNo}.pdf`,
    );
    res.header('Content-Length', buffer.length.toString());

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
}