// src/orders/orders.controller.ts
import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { OrdersService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard'; 
import { UserRequest } from 'src/auth/auth.types'; 
import { ApiBearerAuth, ApiOperation, ApiTags, ApiBody } from '@nestjs/swagger';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('place-order/cod')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Place a new Cash on Delivery order for selected cart items' })
  @ApiBody({ type: CreateOrderDto })
  async placeCashOnDeliveryOrder(
    @Req() req: UserRequest,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    if (createOrderDto.paymentMethod !== 'cash_on_delivery') {
      throw new BadRequestException('Invalid payment method for this endpoint.');
    }

    const customerUserId = req.user.id;
    return this.ordersService.createCashOnDeliveryOrder(
      customerUserId,
      createOrderDto,
    );
  }
}