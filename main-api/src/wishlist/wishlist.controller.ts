import { Controller, Post, Get, Delete, Body, UseGuards, Req, Param, ParseUUIDPipe } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { AddToWishlistDto } from './dto/add-to-wishlist.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Your JWT guard
import { UserRequest } from '../auth/auth.types'; // Your custom request type

@ApiTags('Wishlist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post()
  @ApiOperation({ summary: 'Add a product to the user\'s wishlist' })
  @ApiResponse({ status: 201, description: 'Product added successfully.'})
  @ApiResponse({ status: 409, description: 'Product is already in the wishlist.'})
  addToWishlist(@Req() req: UserRequest, @Body() addToWishlistDto: AddToWishlistDto) {
    const customerUserId = req.user.id;
    return this.wishlistService.addToWishlist(customerUserId, addToWishlistDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products in the user\'s wishlist' })
  @ApiResponse({ status: 200, description: 'Returns a list of wishlist items.'})
  getWishlist(@Req() req: UserRequest) {
    const customerUserId = req.user.id;
    return this.wishlistService.getWishlist(customerUserId);
  }

  @Delete(':wishlistItemId')
  @ApiOperation({ summary: 'Remove a product from the user\'s wishlist' })
  @ApiResponse({ status: 200, description: 'Product removed successfully.'})
  @ApiResponse({ status: 404, description: 'Wishlist item not found or does not belong to the user.'})
  removeFromWishlist(
    @Req() req: UserRequest,
    @Param('wishlistItemId', ParseUUIDPipe) wishlistItemId: string,
  ) {
    const customerUserId = req.user.id;
    return this.wishlistService.removeFromWishlist(customerUserId, wishlistItemId);
  }
}