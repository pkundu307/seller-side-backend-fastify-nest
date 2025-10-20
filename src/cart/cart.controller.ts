import { Controller, Post, Body, Req, UseGuards, Param, Patch, Get } from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard'; // Use the exported guard
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express'; // Use express Request type for simplicity with Nest
import { CustomerUser } from '@prisma/client'; // Assuming CustomerUser is your user type
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

// Extending the Express Request object to hold user details
interface UserRequest extends Request {
  user: {
    id: string; // This is the customerUserId (payload.sub)
    email: string;
    role: string;
  };
}

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('add-item')
  @UseGuards(JwtAuthGuard) // Protect the route with JWT
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add an item (product/variant) to the authenticated user\'s cart' })
  async addItemToCart(@Body() dto: AddToCartDto, @Req() req: UserRequest) {
    const customerUserId = req.user.id; // Get the user ID from the JWT payload (validated by JwtAuthGuard)
    
    return this.cartService.addItem(customerUserId, dto);
  }
    @Get()
  @UseGuards(JwtAuthGuard) // Protect the route with JWT
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all items in the authenticated user\'s cart' })
  async getCart(@Req() req: UserRequest) {
    return this.cartService.getCartItems(req.user.id);
  }

  // --- NEW API 2: Update Cart Item by ID ---
  @Patch(':id')
  @ApiOperation({ summary: 'Update the quantity or customization details of a cart item' })
  async updateCartItem(
    @Param('id') cartItemId: string,
    @Body() dto: UpdateCartItemDto,
    @Req() req: UserRequest,
  ) {
    return this.cartService.updateCartItem(req.user.id, cartItemId, dto);
  }
}