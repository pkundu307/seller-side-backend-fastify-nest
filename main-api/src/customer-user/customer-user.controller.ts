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
  Delete,
} from '@nestjs/common';
import { CustomerUserService } from './customer-user.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';

// --- Import your real authentication guard and request type ---
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserRequest } from '../auth/auth.types';
import { AddToWaitlistDto } from './dto/add-to-waitlist.dto';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';

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

    @Delete(':addressId')
  @ApiOperation({ summary: 'Delete an address by its ID' })
  async deleteAddress(
    @Req() req: UserRequest,
    @Param('addressId', ParseUUIDPipe) addressId: string,
  ) {
    const userId = req.user.id;
    return this.customerUserService.deleteAddress(userId, addressId);
  }

    @Post('waitlist')
  @ApiOperation({ summary: 'Notify me when a product is back in stock' })
  async addToWaitlist(
    @Req() req: UserRequest,
    @Body() dto: AddToWaitlistDto,
  ) {
    return this.customerUserService.addToWaitlist(req.user.id, dto);
  }

  @Get('waitlist')
  @ApiOperation({ summary: 'View my active restock alerts' })
  async getMyWaitlist(@Req() req: UserRequest) {
    return this.customerUserService.getMyWaitlist(req.user.id);
  }
  @Post('review/:productId')
  @ApiOperation({ summary: 'Create a review for a product' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        rating: { type: 'string', example: '5', description: 'Rating 1-5' },
        title: { type: 'string', example: 'Great product!' },
        comment: { type: 'string', example: 'Excellent quality' },
        file: { type: 'string', format: 'binary' },
      },
      required: ['rating'],
    },
  })
  async createReview(
    @Req() req: any,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    // ✅ Parse multipart data manually
    const data: any = {};
    let file: any = null;

    if (req.isMultipart && req.isMultipart()) {
      const parts = req.parts();
      
      for await (const part of parts) {
        if (part.type === 'file') {
          const buffer = await part.toBuffer();
          file = {
            buffer,
            filename: part.filename,
            mimetype: part.mimetype,
            encoding: part.encoding,
          };
        } else {
          // Text field
          data[part.fieldname] = part.value;
        }
      }
    }

    console.log('Received review creation request:', {
      userId: req.user.id,
      productId,
      data,
      hasFile: !!file,
    });

    const userId = req.user.id;
    return this.customerUserService.createReview(userId, productId, data, file);
  }

  @Patch('review/:reviewId')
  @ApiOperation({ summary: 'Edit an existing review' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        rating: { type: 'string', example: '5' },
        title: { type: 'string' },
        comment: { type: 'string' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  async updateReview(
    @Req() req: any,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
  ) {
    // ✅ Parse multipart data manually
    const data: any = {};
    let file: any = null;

    if (req.isMultipart && req.isMultipart()) {
      const parts = req.parts();
      
      for await (const part of parts) {
        if (part.type === 'file') {
          const buffer = await part.toBuffer();
          file = {
            buffer,
            filename: part.filename,
            mimetype: part.mimetype,
            encoding: part.encoding,
          };
        } else {
          data[part.fieldname] = part.value;
        }
      }
    }

    console.log('Received review update request:', {
      userId: req.user.id,
      reviewId,
      data,
      hasFile: !!file,
    });

    const userId = req.user.id;
    return this.customerUserService.updateReview(userId, reviewId, data, file);
  }

  @Get('my-reviews')
  @ApiOperation({ summary: 'Get all reviews written by the logged-in user' })
  async getMyReviews(@Req() req: UserRequest) {
    return this.customerUserService.getMyReviews(req.user.id);
  }


}