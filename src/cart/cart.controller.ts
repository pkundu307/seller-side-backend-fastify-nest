import { Controller, Post, Body, Req, UseGuards, Param, Patch, Get, Delete } from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

interface UserRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@ApiTags('Cart')
@Controller('cart')
@UseGuards(JwtAuthGuard) // Apply guard to the whole controller
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('add-item')
  @ApiOperation({ summary: 'Add an item to cart. Updates quantity if item already exists.' })
  async addItemToCart(@Body() dto: AddToCartDto, @Req() req: UserRequest) {
    return this.cartService.addItem(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all items in the authenticated user\'s cart' })
  async getCart(@Req() req: UserRequest) {
    return this.cartService.getCartItems(req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a specific cart item (e.g., quantity)' })
  async updateCartItem(
    @Param('id') cartItemId: string,
    @Body() dto: UpdateCartItemDto,
    @Req() req: UserRequest,
  ) {
    return this.cartService.updateCartItem(req.user.id, cartItemId, dto);
  }

  // It's good practice to add a DELETE endpoint as well
  @Delete(':id')
  @ApiOperation({ summary: 'Remove an item from the cart' })
  async removeItemFromCart(@Param('id') cartItemId: string, @Req() req: UserRequest) {
    // You would implement a `removeItem` method in your service for this
    // return this.cartService.removeItem(req.user.id, cartItemId);
  }
}