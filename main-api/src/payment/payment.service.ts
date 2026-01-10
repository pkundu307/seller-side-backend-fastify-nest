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
import products from 'razorpay/dist/types/products';

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
        details: { // Store everything needed to rebuild the order
          items: dto.items,
          couponCode: dto.couponCode,
          priceDetails: priceDetails,
        } as any, // Cast to 'any' for Prisma Json type
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

 

// src/payment/payment.service.ts

async verifyPayment(dto: VerifyPaymentDto) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = dto;
  const razorpaySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
  if (!razorpaySecret) {
    throw new InternalServerErrorException('Razorpay secret key is not configured.');
  }

  // 1. Verify Signature
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto.createHmac('sha256', razorpaySecret).update(body.toString()).digest('hex');
  if (expectedSignature !== razorpay_signature) {
    throw new BadRequestException('Invalid Razorpay signature.');
  }

  // 2. Find OrderInitiate record
  const orderInitiate = await this.prisma.orderInitiate.findFirst({
    where: { orderId: razorpay_order_id },
  });
  if (!orderInitiate) {
    throw new NotFoundException(`Order initiation record not found.`);
  }

  // 3. Extract details and perform security checks
  const details = orderInitiate.details as any;
  if (!details || !details.items) {
      throw new InternalServerErrorException("Order initiation data is corrupt.");
  }
  const itemsDto: CreatePaymentInitiationDto = { items: details.items, couponCode: details.couponCode };
  
  const verifiedPriceDetails = await this.calculateOrderTotal(itemsDto);
  
  const razorpayOrder = await this.razorpay.orders.fetch(razorpay_order_id);
  if (Math.round(verifiedPriceDetails.totalAmount * 100) !== razorpayOrder.amount) {
    throw new InternalServerErrorException("Price mismatch during verification.");
  }
  
  const defaultAddress = await this.prisma.address.findFirst({
      where: { customerUserId: orderInitiate.customerUserId, isDefault: true },
  });
  if (!defaultAddress) {
      throw new BadRequestException("No default address found for this user.");
  }

  // 4. Execute the final order creation in a database transaction
  try {
    const finalOrderWithDetails = await this.prisma.$transaction(async (tx) => {
      // (Mark initiation as completed)
      await tx.orderInitiate.update({
        where: { id: orderInitiate.id },
        data: { status: 'completed' },
      });

      // (Fetch variants and check stock)
      const variantIds = itemsDto.items.map(item => item.variantId);
      const variants = await tx.variant.findMany({
          where: { id: { in: variantIds } },
          select: { id: true, price: true, productId: true, stock: true }
      });
      for (const item of itemsDto.items) {
          const variant = variants.find(v => v.id === item.variantId);
          if (!variant || variant.stock < item.quantity) {
              throw new BadRequestException(`Insufficient stock for one or more items.`);
          }
      }

      // (Create the Order)
      const createdOrder = await tx.order.create({
        data: {
          customerUserId: orderInitiate.customerUserId,
          orderNumber: `ORD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          totalAmount: verifiedPriceDetails.totalAmount,
          discount: verifiedPriceDetails.discountAmount,
          shippingFee: verifiedPriceDetails.shippingFee,
          paymentMethod: PaymentMethod.online,
          paymentStatus: PaymentStatus.completed,
          status: OrderStatus.pending,
          selectedAddress: defaultAddress as any,
          items: {
            create: itemsDto.items.map(item => {
              const variant = variants.find(v => v.id === item.variantId)!;
              return {
                productId: variant.productId,
                variantId: item.variantId,
                quantity: item.quantity,
                priceAtTimeOfOrder: variant.price,
              };
            }),
          },
        }
      });
      
      // (Decrement stock)
      for (const item of itemsDto.items) {
          await tx.variant.update({
              where: { id: item.variantId },
              data: { stock: { decrement: item.quantity } },
          });
      }
      
      // (Clear cart)
      const cartItemVariantIds = itemsDto.items.map(i => i.variantId);
      await tx.cartItem.deleteMany({
        where: {
          customerUserId: orderInitiate.customerUserId,
          variantId: { in: cartItemVariantIds },
        },
      });

      // Re-fetch the newly created order with details
      return tx.order.findUnique({
          where: { id: createdOrder.id },
          select: {
              id: true,
              orderNumber: true,
              createdAt: true,
              totalAmount: true,
              selectedAddress: true,
              items: {
                  select: {
                      quantity: true,
                      priceAtTimeOfOrder: true,
                      variant: { // <-- This is the source of the `possibly 'null'` error
                          select: {
                              product: {
                                  select: {
                                      title: true,
                                      images: true,
                                  }
                              }
                          }
                      }
                  }
              }
          }
      });
    });

    // --- THIS IS THE FIX ---
    // Add a check to ensure the final object is not null before proceeding.
    if (!finalOrderWithDetails) {
      // This case should theoretically never happen if the transaction succeeded.
      // It's a failsafe for type safety and edge cases.
      throw new InternalServerErrorException('Failed to retrieve order details after creation.');
    }
    // --- END OF FIX ---

    // 5. Format the final response object for the frontend
    return {
      success: true,
      message: 'Payment verified and order created successfully.',
      order: {
        id: finalOrderWithDetails.id,
        orderNumber: finalOrderWithDetails.orderNumber,
        createdAt: finalOrderWithDetails.createdAt,
        totalAmount: finalOrderWithDetails.totalAmount,
        selectedAddress: finalOrderWithDetails.selectedAddress,
        items: finalOrderWithDetails.items.map(item => {
          // --- THIS IS THE SECOND FIX ---
          // Add a check for the `variant` and `product` relations.
          if (!item.variant || !item.variant.product) {
              // This is an unexpected state, but we handle it gracefully.
              return {
                  productName: 'Product information unavailable',
                  imageUrl: null,
                  quantity: item.quantity,
                  price: item.priceAtTimeOfOrder,
              };
          }
          // --- END OF FIX ---

          return {
            productName: item.variant.product.title,
            imageUrl: item.variant.product.images.length > 0 ? item.variant.product.images[0] : null,
            quantity: item.quantity,
            price: item.priceAtTimeOfOrder,
          };
        }),
      },
    };

  } catch (error) {
    console.error('[VERIFY_PAYMENT] Transaction failed:', error);
    // Automatically refund the payment if our system fails to create the order
    await this.razorpay.payments.refund(razorpay_payment_id, {
        amount: razorpayOrder.amount,
        notes: { reason: "Order creation failed in our system after successful payment." }
    });
    
    throw new InternalServerErrorException('Failed to create order after payment. The payment has been refunded. Please try again.');
  }
}
}