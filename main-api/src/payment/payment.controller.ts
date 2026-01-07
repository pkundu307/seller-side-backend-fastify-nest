import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentInitiationDto } from './dto/create-payment-initiation.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

// --- Import your real authentication guard and request type ---
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserRequest } from '../auth/auth.types';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Creates a Razorpay order after calculating the final price with discounts.
   * This endpoint is protected and requires a valid customer JWT.
   */
  @Post('initiate')
  @UseGuards(JwtAuthGuard) // <-- PROTECT THE ROUTE
  @ApiBearerAuth() // <-- Document in Swagger that it needs a token
  @ApiOperation({ summary: 'Initiate an online order with Razorpay' })
  @ApiResponse({ status: 201, description: 'Razorpay order created successfully.'})
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., invalid coupon).'})
  @ApiResponse({ status: 401, description: 'Unauthorized.'})
  async initiateOrder(
    @Req() req: UserRequest, // <-- Use the typed request
    @Body() dto: CreatePaymentInitiationDto,
  ) {
    const customerUserId = req.user.id; // <-- EXTRACT USER ID FROM TOKEN
    return this.paymentService.initiateOrder(customerUserId, dto);
  }

  /**
   * Verifies a Razorpay payment.
   * This endpoint MUST be public for Razorpay's webhook to work.
   * Security is handled by signature verification inside the service.
   */
  @Post('verify')
  @ApiOperation({ summary: 'Verify a Razorpay payment (for Webhook/Callback)' })
  @ApiResponse({ status: 201, description: 'Payment verified successfully.'})
  @ApiResponse({ status: 400, description: 'Invalid signature.'})
  async verifyPayment(@Body() dto: VerifyPaymentDto) {
    return this.paymentService.verifyPayment(dto);
  }
}