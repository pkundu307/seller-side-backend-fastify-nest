import {
  Controller,
  Post,
  Get,
  Query,
  Body,
  Req,
  UseGuards,
  BadRequestException,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { OrdersService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard'; 
import { UserRequest } from 'src/auth/auth.types'; 
import { ApiBearerAuth, ApiOperation, ApiTags, ApiBody, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { CancelOrderDto } from './dto/cancel-order.dto';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('place-order/cod')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Place a new Cash on Delivery order' })
  @ApiBody({ type: CreateOrderDto })
  async placeCashOnDeliveryOrder(
    @Req() req: UserRequest,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createCashOnDeliveryOrder(req.user.id, dto);
  }

  @Get('success')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order details for success page' })
  @ApiQuery({ name: 'orderId', required: true, type: String })
  async getOrderSuccess(
    @Req() req: UserRequest,
    @Query('orderId') orderId: string,
  ) {
    if (!orderId) throw new BadRequestException('Order ID is required');
    return this.ordersService.getOrderSuccessDetails(req.user.id, orderId);
  }

    @Get('my-orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all orders for the logged-in user' })
  @ApiResponse({ status: 200, description: 'List of user orders.' })
  async getMyOrders(@Req() req: UserRequest) {
    const customerUserId = req.user.id;
    return this.ordersService.findAllByCustomer(customerUserId);
  }

   @Get('my-orders/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get details of a specific order' })
  async getSingleOrder(
    @Req() req: UserRequest,
    @Param('id') id: string, // <--- Captures the UUID from the URL
  ) {
    return this.ordersService.findOneByCustomer(req.user.id, id);
  }

  @Post(':orderId/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel an order (Customer)' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully.'})
  @ApiResponse({ status: 400, description: 'Order cannot be cancelled at its current stage.'})
  @ApiResponse({ status: 403, description: 'User does not have permission to cancel this order.'})
  @ApiResponse({ status: 404, description: 'Order not found.'})
  async cancelMyOrder(
    @Req() req: UserRequest,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() cancelOrderDto: CancelOrderDto,
  ) {
    const customerUserId = req.user.id;
    return this.ordersService.cancelOrder(customerUserId, orderId, cancelOrderDto);
  }
}