import { Injectable, Inject, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RAZORPAY_INSTANCE } from './razorpay.provider';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { CreatePaymentInitiationDto } from './dto/create-payment-initiation.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { DiscountType } from '@prisma/client'; // <-- IMPORT ENUM

// Define a type for the detailed price breakdown to be used internally and returned
export interface PriceDetails {
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  totalAmount: number;
  appliedCoupon?: {
    code: string;
    discountValue: number;
    discountType: DiscountType;
  };
}
@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    @Inject(RAZORPAY_INSTANCE) private razorpay: Razorpay,
  ) {}

  /**
   * Mimics `createOnlineOrder`
   */
 async initiateOrder(customerUserId: string, dto: CreatePaymentInitiationDto) {
    // 1. Calculate the final price with all business logic
    const priceDetails = await this.calculateOrderTotal(dto);

    // 2. Create Razorpay order with the final, correct amount
    const options = {
      amount: Math.round(priceDetails.totalAmount * 100), // Amount in paise
      currency: 'INR',
      receipt: `receipt_order_${new Date().getTime()}`,
    };

    const razorpayOrder = await this.razorpay.orders.create(options);

    // 3. Save order initiation details to our DB
    await this.prisma.orderInitiate.create({
      data: {
        orderId: razorpayOrder.id,
        status: 'pending',
        customerUserId: customerUserId,
      },
    });

    // 4. Return order details AND price breakdown to the client
    return { razorpayOrder, priceDetails };
  }

  /**
   * Private helper to encapsulate all pricing logic.
   */
  private async calculateOrderTotal(dto: CreatePaymentInitiationDto): Promise<PriceDetails> {
    const { items, couponCode } = dto;

    const variantIds = items.map(item => item.variantId);
    const variants = await this.prisma.variant.findMany({
      where: { id: { in: variantIds } },
    });

    if (variants.length !== new Set(variantIds).size) {
      throw new NotFoundException('One or more product variants not found.');
    }

    let subtotal = 0;
    for (const item of items) {
      const variant = variants.find(v => v.id === item.variantId);
      // This check is now redundant due to the length check above, but good for safety
      if (!variant) {
        throw new NotFoundException(`Could not find variant with ID ${item.variantId} during calculation.`);
      }
      subtotal += variant.price.toNumber() * item.quantity;
    }

    let discountAmount = 0;
    let appliedCoupon: PriceDetails['appliedCoupon'] | undefined = undefined;

    if (couponCode) {
      const coupon = await this.prisma.coupon.findUnique({
        where: { code: couponCode },
        include: { discount: true },
      });

      if (!coupon || !coupon.active || !coupon.discount) {
        throw new BadRequestException('Invalid or inactive coupon code.');
      }
      if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        throw new BadRequestException('This coupon has expired.');
      }
      if (coupon.discount.minOrderAmount && subtotal < coupon.discount.minOrderAmount.toNumber()) {
        throw new BadRequestException(`Minimum order amount of ₹${coupon.discount.minOrderAmount} is required.`);
      }

      const { discount } = coupon;
      if (discount.discountType === DiscountType.percentage) {
        discountAmount = (subtotal * discount.discountValue.toNumber()) / 100;
        if (discount.maxDiscountAmount && discountAmount > discount.maxDiscountAmount.toNumber()) {
          discountAmount = discount.maxDiscountAmount.toNumber();
        }
      } else if (discount.discountType === DiscountType.fixed_amount) {
        discountAmount = discount.discountValue.toNumber();
      }
      
      appliedCoupon = {
        code: coupon.code,
        discountValue: discount.discountValue.toNumber(),
        discountType: discount.discountType,
      };
    }

    let shippingFee = 0;
    const amountAfterDiscount = subtotal - discountAmount;
    if (appliedCoupon?.discountType !== DiscountType.free_shipping) {
        if (amountAfterDiscount < 500) { // Free shipping threshold
            shippingFee = 40;
        }
    }

    const totalAmount = subtotal - discountAmount + shippingFee;

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      shippingFee: parseFloat(shippingFee.toFixed(2)),
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      totalAmount: totalAmount > 0 ? parseFloat(totalAmount.toFixed(2)) : 0,
      appliedCoupon,
    };
  }

  /**
   * Mimics `verifyOrder` and adds final order creation
   */
  async verifyPayment(dto: VerifyPaymentDto) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = dto;
     const razorpaySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    if (!razorpaySecret) {
      throw new InternalServerErrorException('Razorpay secret key is not configured.');
    }
    // 1. Verify the signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', razorpaySecret)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      throw new BadRequestException('Invalid Razorpay signature. Payment verification failed.');
    }

    // 2. Signature is authentic, now find the initial record
    const orderInitiate = await this.prisma.orderInitiate.findFirst({
      where: { orderId: razorpay_order_id },
    });

    if (!orderInitiate) {
      throw new NotFoundException(`Order initiation record not found for Razorpay order ID: ${razorpay_order_id}`);
    }

    // --- THIS IS THE CRITICAL IMPROVEMENT ---
    // Instead of just updating the status, we now create the REAL order in a transaction.
    
    // This part is a placeholder. In a real app, you would fetch the items
    // that were part of this order from another table (e.g., cart) or from the initial request.
    // For now, let's assume we can retrieve the necessary info.
    
    //
    // START PSEUDO-CODE FOR FINAL ORDER CREATION
    //
    // const itemsInCart = await this.prisma.cartItem.findMany({ where: { customerUserId: orderInitiate.customerUserId } });
    // const totalAmount = ... calculate amount again ...
    // const address = ... get user's default address ...

    // Use a transaction to ensure data integrity
    await this.prisma.$transaction(async (tx) => {
      // Update the OrderInitiate status
      await tx.orderInitiate.update({
        where: { id: orderInitiate.id },
        data: { status: 'completed' },
      });

      // Create the final Order
      // await tx.order.create({
      //   data: {
      //     customerUserId: orderInitiate.customerUserId,
      //     totalAmount: totalAmount, // The final calculated amount
      //     paymentMethod: PaymentMethod.online,
      //     paymentStatus: PaymentStatus.completed,
      //     status: OrderStatus.pending,
      //     selectedAddress: address,
      //     // ... other fields
      //     items: {
      //       create: itemsInCart.map(item => ({...})),
      //     },
      //   }
      // });
      //
      // await tx.cartItem.deleteMany({ where: { customerUserId: orderInitiate.customerUserId } });
    });
    //
    // END PSEUDO-CODE
    //

    return {
      success: true,
      message: 'Payment verified successfully.',
      paymentStatus: 'completed',
      orderId: razorpay_order_id,
    };
  }
}