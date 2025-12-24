import { Controller, Get, Param, UseGuards, Req, Query, ForbiddenException, ParseUUIDPipe, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SellerService } from './seller.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Your JWT guard
import { UserRequest } from '../auth/auth.types'; // Your custom request type
import { SellerPaginationDto } from './dto/seller-pagination.dto';
import { PrismaService } from '../prisma/prisma.service'; // To check business ownership

@ApiTags('Seller Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('seller')
export class SellerController {
  constructor(
    private readonly sellerService: SellerService,
    private readonly prisma: PrismaService, // Inject Prisma for ownership check
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
}