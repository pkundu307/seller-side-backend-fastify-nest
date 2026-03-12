import { 
  Injectable, 
  Inject, 
  NotFoundException, 
  BadRequestException, 
  InternalServerErrorException,
  Logger
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RAZORPAY_INSTANCE } from './razorpay.provider';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { CreatePaymentInitiationDto } from './dto/create-payment-initiation.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { OrderStatus, PaymentMethod, PaymentStatus, DiscountType, Prisma, NotificationType } from '@prisma/client';

// ─── Constants ───────────────────────────────────────────────────────────────
const PLATFORM_FEE = 4;
const SHIPPING_FEE = 40;
const SHIPPING_THRESHOLD = 599;

export interface PriceDetails {
  subtotal: number;
  shippingFee: number;       // pure shipping (0 or 40)
  platformFee: number;       // always 4
  discountAmount: number;
  totalAmount: number;       // subtotal - discount + shippingFee + platformFee
  appliedCoupon?: {
    code: string;
    discountValue: number;
    discountType: DiscountType;
  };
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    @Inject(RAZORPAY_INSTANCE) private razorpay: Razorpay,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // INITIATE ORDER
  // ─────────────────────────────────────────────────────────────────────────
  async initiateOrder(customerUserId: string, dto: CreatePaymentInitiationDto) {
    this.logger.log(`[INITIATE_ORDER] Starting for user: ${customerUserId}`);

    try {
      const variantIds = dto.items.map(item => item.variantId);
      const cartItems = await this.prisma.cartItem.findMany({
        where: { customerUserId, variantId: { in: variantIds } },
        include: { variant: { include: { product: true } } },
      });

      if (cartItems.length !== variantIds.length) {
        throw new BadRequestException('One or more cart items not found.');
      }

      const itemsWithCustomization = cartItems.map(cartItem => {
        const dtoItem = dto.items.find(i => i.variantId === cartItem.variantId);
        return {
          variantId: cartItem.variantId,
          quantity: dtoItem?.quantity || cartItem.quantity,
          customizationDetails: cartItem.customizationDetails,
          customizationImages: cartItem.customizationImages,
        };
      });

      const priceDetails = await this.calculateOrderTotal({
        items: itemsWithCustomization,
        couponCode: dto.couponCode,
      });
      this.logger.log(`[INITIATE_ORDER] Price: ${JSON.stringify(priceDetails)}`);

      if (priceDetails.totalAmount <= 0) {
        throw new BadRequestException(
          'Order total is ₹0 after discount. Please add more items.',
        );
      }

      const options = {
        amount: Math.round(priceDetails.totalAmount * 100),
        currency: 'INR',
        receipt: `receipt_order_${Date.now()}`,
      };

      const razorpayOrder = await this.razorpay.orders.create(options);
      this.logger.log(`[INITIATE_ORDER] Razorpay order created: ${razorpayOrder.id}`);

      await this.prisma.orderInitiate.create({
        data: {
          orderId: razorpayOrder.id,
          status: 'pending',
          customerUserId,
          details: {
            items: itemsWithCustomization,
            couponCode: dto.couponCode,
            priceDetails,
          } as any,
        },
      });

      return { razorpayOrder, priceDetails };
    } catch (error) {
      this.logger.error(`[INITIATE_ORDER] Failed:`, error.stack);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VERIFY PAYMENT
  // ─────────────────────────────────────────────────────────────────────────
  async verifyPayment(dto: VerifyPaymentDto) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = dto;
    this.logger.log(`[VERIFY_PAYMENT] Starting for order: ${razorpay_order_id}`);

    const razorpaySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    if (!razorpaySecret) {
      throw new InternalServerErrorException('Razorpay secret key is not configured.');
    }

    // 1. Verify Signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', razorpaySecret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      throw new BadRequestException('Invalid Razorpay signature.');
    }
    this.logger.log('[VERIFY_PAYMENT] Signature verified');

    // 2. Find OrderInitiate
    const orderInitiate = await this.prisma.orderInitiate.findFirst({
      where: { orderId: razorpay_order_id },
    });
    if (!orderInitiate) {
      throw new NotFoundException('Order initiation record not found.');
    }

    // 3. Extract details
    const details = orderInitiate.details as any;
    if (!details?.items) {
      throw new InternalServerErrorException('Order initiation data is corrupt.');
    }

    const itemsWithCustomization = details.items;
    const itemsDto = { items: itemsWithCustomization, couponCode: details.couponCode };

    // 4. Recalculate & verify price
    const verifiedPriceDetails = await this.calculateOrderTotal(itemsDto);

    const razorpayOrder = await this.razorpay.orders.fetch(razorpay_order_id);
    if (Math.round(verifiedPriceDetails.totalAmount * 100) !== razorpayOrder.amount) {
      throw new InternalServerErrorException('Price mismatch during verification.');
    }
    this.logger.log('[VERIFY_PAYMENT] Price verified');

    // 5. Get address — default first, fallback to latest
    const defaultAddress =
      (await this.prisma.address.findFirst({
        where: { customerUserId: orderInitiate.customerUserId, isDefault: true },
      })) ??
      (await this.prisma.address.findFirst({
        where: { customerUserId: orderInitiate.customerUserId },
        orderBy: { createdAt: 'desc' },
      }));

    if (!defaultAddress) {
      throw new BadRequestException('No delivery address found for this user.');
    }

    // 6. Transaction
    try {
      const finalOrderWithDetails = await this.prisma.$transaction(async (tx) => {
        await tx.orderInitiate.update({
          where: { id: orderInitiate.id },
          data: { status: 'completed' },
        });

        const variantIds = itemsWithCustomization.map(item => item.variantId);
        const variants = await tx.variant.findMany({
          where: { id: { in: variantIds } },
          include: { product: true },
        });

        const involvedBusinessIds = new Set<string>();
        for (const item of itemsWithCustomization) {
          const variant = variants.find(v => v.id === item.variantId);
          if (!variant) throw new NotFoundException(`Variant ${item.variantId} not found.`);
          if (variant.stock < item.quantity) {
            throw new BadRequestException(`Insufficient stock for ${variant.product.title}.`);
          }
          if (variant.product.businessId) {
            involvedBusinessIds.add(variant.product.businessId);
          }
        }

        const orderNumber = `ORD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

        const createdOrder = await tx.order.create({
          data: {
            customerUserId: orderInitiate.customerUserId,
            orderNumber,
            totalAmount: verifiedPriceDetails.totalAmount,
            discount: verifiedPriceDetails.discountAmount,
            // ─── shippingFee stores shipping + platformFee (no DB change) ───
            shippingFee: verifiedPriceDetails.shippingFee + verifiedPriceDetails.platformFee,
            couponCode: verifiedPriceDetails.appliedCoupon?.code ?? null,
            couponDiscount: verifiedPriceDetails.discountAmount > 0
              ? verifiedPriceDetails.discountAmount
              : null,
            paymentMethod: PaymentMethod.online,
            paymentStatus: PaymentStatus.completed,
            status: OrderStatus.pending,
            selectedAddress: defaultAddress as any,
            items: {
              create: itemsWithCustomization.map(item => {
                const variant = variants.find(v => v.id === item.variantId)!;
                return {
                  productId: variant.productId,
                  variantId: item.variantId,
                  quantity: item.quantity,
                  priceAtTimeOfOrder: variant.price,
                  customizationDetails: item.customizationDetails || Prisma.JsonNull,
                  customizationImages: item.customizationImages || [],
                };
              }),
            },
          },
        });
        this.logger.log(`[VERIFY_PAYMENT] [TXN] Order created: ${createdOrder.id}`);

        // ─── Redeem Coupon ────────────────────────────────────────────────
        if (verifiedPriceDetails.appliedCoupon?.code) {
          const coupon = await tx.coupon.findUnique({
            where: { code: verifiedPriceDetails.appliedCoupon.code },
          });
          if (coupon) {
            await tx.couponUsage.create({
              data: {
                couponId: coupon.id,
                customerUserId: orderInitiate.customerUserId,
                orderId: createdOrder.id,
                discountApplied: verifiedPriceDetails.discountAmount,
              },
            });
            await tx.coupon.update({
              where: { id: coupon.id },
              data: { usedCount: { increment: 1 } },
            });
            this.logger.log(`[VERIFY_PAYMENT] [TXN] Coupon redeemed: ${coupon.code}`);
          }
        }

        // ─── Decrement Stock ──────────────────────────────────────────────
        for (const item of itemsWithCustomization) {
          await tx.variant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } },
          });
        }

        // ─── Clear Cart ───────────────────────────────────────────────────
        await tx.cartItem.deleteMany({
          where: {
            customerUserId: orderInitiate.customerUserId,
            variantId: { in: variantIds },
          },
        });

        // ─── Notify Customer ──────────────────────────────────────────────
        await tx.customerNotification.create({
          data: {
            customerUserId: orderInitiate.customerUserId,
            title: 'Order Placed Successfully',
            message: `Your order ${orderNumber} has been placed for ₹${verifiedPriceDetails.totalAmount}.`,
            type: NotificationType.ORDER,
            metadata: { orderId: createdOrder.id, orderNumber },
          },
        });

        // ─── Notify Sellers ───────────────────────────────────────────────
        if (involvedBusinessIds.size > 0) {
          const sellers = await tx.user.findMany({
            where: { businesses: { some: { id: { in: Array.from(involvedBusinessIds) } } } },
            select: { id: true },
          });
          for (const seller of sellers) {
            await tx.sellerNotification.create({
              data: {
                userId: seller.id,
                title: 'New Online Order',
                message: `New online order ${orderNumber}.`,
                type: NotificationType.ORDER,
                metadata: { orderId: createdOrder.id, orderNumber },
              },
            });
          }
        }

        return tx.order.findUnique({
          where: { id: createdOrder.id },
          select: {
            id: true,
            orderNumber: true,
            createdAt: true,
            totalAmount: true,
            selectedAddress: true,
            couponCode: true,
            couponDiscount: true,
            items: {
              select: {
                quantity: true,
                priceAtTimeOfOrder: true,
                customizationDetails: true,
                customizationImages: true,
                variant: {
                  select: {
                    id: true,
                    sku: true,
                    product: { select: { title: true, images: true } },
                  },
                },
              },
            },
          },
        });
      });

      if (!finalOrderWithDetails) {
        throw new InternalServerErrorException('Failed to retrieve order details after creation.');
      }

      this.logger.log(`[VERIFY_PAYMENT] Done: ${finalOrderWithDetails.orderNumber}`);

      return {
        success: true,
        message: 'Payment verified and order created successfully.',
        order: {
          id: finalOrderWithDetails.id,
          orderNumber: finalOrderWithDetails.orderNumber,
          createdAt: finalOrderWithDetails.createdAt,
          totalAmount: finalOrderWithDetails.totalAmount,
          selectedAddress: finalOrderWithDetails.selectedAddress,
          couponCode: finalOrderWithDetails.couponCode ?? null,
          couponDiscount: finalOrderWithDetails.couponDiscount ?? null,
          items: finalOrderWithDetails.items.map(item => ({
            productName: item.variant?.product?.title || 'Unavailable',
            imageUrl: item.variant?.product?.images?.[0] || null,
            quantity: item.quantity,
            price: item.priceAtTimeOfOrder,
            customizationDetails: item.customizationDetails,
            customizationImages: item.customizationImages,
          })),
        },
      };

    } catch (error) {
      this.logger.error(`[VERIFY_PAYMENT] Transaction failed:`, error.stack);

      try {
        const razorpayOrderForRefund = await this.razorpay.orders.fetch(razorpay_order_id);
        const refund = await this.razorpay.payments.refund(razorpay_payment_id, {
          amount: razorpayOrderForRefund.amount,
          notes: { reason: 'Order creation failed after successful payment.' },
        });
        this.logger.log(`[VERIFY_PAYMENT] Refund initiated: ${refund.id}`);
      } catch (refundError) {
        this.logger.error(`[VERIFY_PAYMENT] Refund failed:`, refundError.stack);
      }

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to create order after payment. A refund has been initiated.',
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CALCULATE ORDER TOTAL
  // ─────────────────────────────────────────────────────────────────────────
  private async calculateOrderTotal(dto: any): Promise<PriceDetails> {
    const { items, couponCode } = dto;

    const variantIds = items.map(item => item.variantId);
    const variants = await this.prisma.variant.findMany({
      where: { id: { in: variantIds } },
    });

    if (variants.length !== new Set(variantIds).size) {
      throw new NotFoundException('One or more product variants not found.');
    }

    // ─── Subtotal ─────────────────────────────────────────────────────────
    let subtotal = 0;
    for (const item of items) {
      const variant = variants.find(v => v.id === item.variantId);
      if (!variant) throw new NotFoundException(`Variant ${item.variantId} not found.`);
      subtotal += variant.price.toNumber() * item.quantity;
    }

    // ─── Coupon Discount ──────────────────────────────────────────────────
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
      if (
        coupon.discount.minOrderAmount &&
        subtotal < coupon.discount.minOrderAmount.toNumber()
      ) {
        throw new BadRequestException(
          `Minimum order amount of ₹${coupon.discount.minOrderAmount} required.`,
        );
      }

      const { discount } = coupon;

      if (discount.discountType === DiscountType.percentage) {
        discountAmount = (subtotal * discount.discountValue.toNumber()) / 100;
        if (discount.maxDiscountAmount && discountAmount > discount.maxDiscountAmount.toNumber()) {
          discountAmount = discount.maxDiscountAmount.toNumber();
        }
      } else if (discount.discountType === DiscountType.fixed_amount) {
        discountAmount = discount.discountValue.toNumber();
        if (discount.maxDiscountAmount && discountAmount > discount.maxDiscountAmount.toNumber()) {
          discountAmount = discount.maxDiscountAmount.toNumber();
        }
      }
      // free_shipping → discountAmount stays 0, handled via shippingFee

      // ─── Cap to subtotal ─────────────────────────────────────────────
      discountAmount = Math.min(discountAmount, subtotal);

      appliedCoupon = {
        code: coupon.code,
        discountValue: discount.discountValue.toNumber(),
        discountType: discount.discountType,
      };

      this.logger.log(`[CALCULATE_TOTAL] Discount: ₹${discountAmount}`);
    }

    // ─── Shipping Fee ─────────────────────────────────────────────────────
    const amountAfterDiscount = subtotal - discountAmount;
    let shippingFee = 0;

    if (appliedCoupon?.discountType !== DiscountType.free_shipping) {
      if (amountAfterDiscount < SHIPPING_THRESHOLD) {
        shippingFee = SHIPPING_FEE;
      }
    }

    // ─── Total (shipping + platform fee, no DB change) ────────────────────
    const totalAmount = subtotal - discountAmount + shippingFee + PLATFORM_FEE;

    const priceDetails: PriceDetails = {
      subtotal: parseFloat(subtotal.toFixed(2)),
      shippingFee: parseFloat(shippingFee.toFixed(2)),
      platformFee: PLATFORM_FEE,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      totalAmount: totalAmount > 0 ? parseFloat(totalAmount.toFixed(2)) : 0,
      appliedCoupon,
    };

    this.logger.log(`[CALCULATE_TOTAL] Total: ₹${priceDetails.totalAmount}`);
    return priceDetails;
  }
}
