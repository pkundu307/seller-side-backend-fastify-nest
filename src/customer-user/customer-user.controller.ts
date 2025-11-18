import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { CustomerUserService } from './customer-user.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

// --- Import your real authentication guard and request type ---
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserRequest } from '../auth/auth.types';

@ApiTags('User Addresses')
@ApiBearerAuth() // Indicates that all endpoints in this controller require a JWT Bearer token
@UseGuards(JwtAuthGuard) // Protect all routes in this controller
@Controller('user/addresses')
export class CustomerUserController {
  constructor(private readonly customerUserService: CustomerUserService) {}

  /**
   * Fetches all addresses for the currently authenticated user.
   */
  @Get()
  @ApiOperation({ summary: 'Get all addresses for the logged-in user' })
  async getMyAddresses(@Req() req: UserRequest) {
    const userId = req.user.id;
    return this.customerUserService.findAddressesByUserId(userId);
  }

  /**
   * Adds a new address for the currently authenticated user.
   */
  @Post()
  @ApiOperation({ summary: 'Add a new address for the logged-in user' })
  async addAddress(
    @Req() req: UserRequest,
    @Body() createAddressDto: CreateAddressDto,
  ) {
    const userId = req.user.id;
    return this.customerUserService.createAddress(userId, createAddressDto);
  }

  /**
   * Updates an existing address belonging to the authenticated user.
   * The service layer ensures the user can only update their own address.
   */
  @Patch(':addressId')
  @ApiOperation({ summary: 'Update an existing address by its ID' })
  async updateAddress(
    @Req() req: UserRequest,
    @Param('addressId', ParseUUIDPipe) addressId: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    const userId = req.user.id;
    return this.customerUserService.updateAddress(
      userId,
      addressId,
      updateAddressDto,
    );
  }
}