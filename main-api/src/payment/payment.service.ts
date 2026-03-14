// src/payment/payment.service.ts
import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RAZORPAY_INSTANCE } from './razorpay.provider';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { CreatePaymentInitiationDto } from './dto/create-payment-initiation.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  DiscountType,
  Prisma,
  NotificationType,
} from '@prisma/client';
import { getStateCode } from 'src/utils/state-codes';
import {
  calculateTotalShipping,
  ShipmentLineItem,
} from './utils/xpressbees-calculator';

// ─────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────
const PLATFORM_FEE = 4; // ₹4 flat platform fee — must match frontend
const PACKAGING_FEE = 8.5; 
// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────
export interface PriceDetails {
  subtotal:       number;
  shippingFee:    number;
  platformFee:    number;   // always PLATFORM_FEE = ₹4
  discountAmount: number;
  packagingFee:   number;   
  totalAmount:    number;
  appliedCoupon?: {
    code:          string;
    discountValue: number;
    discountType:  DiscountType;
    
  };
}

interface StoredOrderDetails {
  items: Array<{
    variantId:             string;
    quantity:              number;
    customizationDetails?: Prisma.JsonValue;
    customizationImages?:  string[];
  }>;
  couponCode?:     string;
  priceDetails:    PriceDetails;
  selectedAddress: Record<string, unknown>; // full Address object
  destStateCode:   string;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma:        PrismaService,
    private readonly configService: ConfigService,
    @Inject(RAZORPAY_INSTANCE) private readonly razorpay: Razorpay,
  ) {}

  // ───────────────────────────────────────────────────────
  // 1. INITIATE ORDER
  // ───────────────────────────────────────────────────────
  async initiateOrder(
    customerUserId: string,
    dto: CreatePaymentInitiationDto,
  ) {
    this.logger.log(`[INITIATE] User: ${customerUserId}`);

    try {
      // 1a. Fetch selected delivery address
      const address = await this.prisma.address.findFirst({
        where: { id: dto.selectedAddressId, customerUserId },
      });

      if (!address) {
        throw new BadRequestException('Selected delivery address not found.');
      }

      // 1b. Resolve destination state code for Xpressbees
      const destStateCode =
        address.stateCode?.trim() ||
        getStateCode(address.state) ||
        '00';

      this.logger.debug(`[INITIATE] Dest state: ${address.state} → code: ${destStateCode}`);

      // 1c. Fetch cart items with customization
      const variantIds = dto.items.map((i) => i.variantId);
      const cartItems  = await this.prisma.cartItem.findMany({
        where: {
          customerUserId,
          variantId: { in: variantIds },
        },
        include: {
          variant: {
            include: { product: true },
          },
        },
      });

      if (cartItems.length !== variantIds.length) {
        throw new BadRequestException('One or more cart items not found.');
      }

      // 1d. Merge cart customization with DTO quantities
      const itemsWithCustomization = cartItems.map((cartItem) => {
        const dtoItem = dto.items.find((i) => i.variantId === cartItem.variantId);
        return {
          variantId:            cartItem.variantId!,
          quantity:             dtoItem?.quantity ?? cartItem.quantity,
          customizationDetails: cartItem.customizationDetails,
          customizationImages:  cartItem.customizationImages,
        };
      });

      // 1e. Calculate price (includes Xpressbees shipping + platform fee)
      const priceDetails = await this.calculateOrderTotal({
        items:         itemsWithCustomization,
        couponCode:    dto.couponCode,
        destStateCode,
      });

      this.logger.log(`[INITIATE] Price: subtotal=₹${priceDetails.subtotal} shipping=₹${priceDetails.shippingFee} platform=₹${priceDetails.platformFee} total=₹${priceDetails.totalAmount}`);

      // 1f. Create Razorpay order
      const razorpayOrder = await this.razorpay.orders.create({
        amount:   Math.round(priceDetails.totalAmount * 100),
        currency: 'INR',
        receipt:  `rcpt_${Date.now()}`,
      });

      this.logger.log(`[INITIATE] Razorpay order: ${razorpayOrder.id}`);

      // 1g. Persist initiation record
      await this.prisma.orderInitiate.create({
        data: {
          orderId:        razorpayOrder.id,
          status:         'pending',
          customerUserId,
          details: {
            items:           itemsWithCustomization,
            couponCode:      dto.couponCode,
            priceDetails,
            selectedAddress: address as unknown as Record<string, unknown>,
            destStateCode,
          } satisfies StoredOrderDetails as unknown as Prisma.JsonObject,
        },
      });

      return { razorpayOrder, priceDetails };
    } catch (error: unknown) {
      this.logger.error(`[INITIATE] Failed:`, (error as Error).stack);
      throw error;
    }
  }

  // ───────────────────────────────────────────────────────
  // 2. VERIFY PAYMENT
  // ───────────────────────────────────────────────────────
  async verifyPayment(dto: VerifyPaymentDto) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = dto;
    this.logger.log(`[VERIFY] Order: ${razorpay_order_id}`);

    const razorpaySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    if (!razorpaySecret) {
      throw new InternalServerErrorException('Razorpay secret key is not configured.');
    }

    // 2a. Verify signature
    const body              = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', razorpaySecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      this.logger.warn(`[VERIFY] Invalid signature for order: ${razorpay_order_id}`);
      throw new BadRequestException('Invalid Razorpay signature.');
    }

    // 2b. Find initiation record
    const orderInitiate = await this.prisma.orderInitiate.findFirst({
      where: { orderId: razorpay_order_id },
    });

    if (!orderInitiate) {
      throw new NotFoundException(`Order initiation record not found.`);
    }

    // 2c. Extract stored details
    const details = orderInitiate.details as unknown as StoredOrderDetails;
    if (!details?.items || !details.selectedAddress || !details.destStateCode) {
      throw new InternalServerErrorException('Order initiation data is corrupt.');
    }

    const { items: itemsWithCustomization, selectedAddress, destStateCode } = details;

    // 2d. Re-verify price on backend (prevents frontend tampering)
    const verifiedPriceDetails = await this.calculateOrderTotal({
      items:         itemsWithCustomization,
      couponCode:    details.couponCode,
      destStateCode,
    });

    // 2e. Cross-check against Razorpay order amount
    const razorpayOrder = await this.razorpay.orders.fetch(razorpay_order_id);
    if (Math.round(verifiedPriceDetails.totalAmount * 100) !== Number(razorpayOrder.amount)) {
      this.logger.error(`[VERIFY] Amount mismatch — expected: ${razorpayOrder.amount}, got: ${Math.round(verifiedPriceDetails.totalAmount * 100)}`);
      throw new InternalServerErrorException('Price mismatch during verification.');
    }

    // 2f. Execute transaction
    try {
      const finalOrder = await this.prisma.$transaction(async (tx) => {
        // Mark initiation complete
        await tx.orderInitiate.update({
          where: { id: orderInitiate.id },
          data:  { status: 'completed' },
        });

        // Fetch variants + product info (stock + businessId)
        const variantIds = itemsWithCustomization.map((i) => i.variantId);
        const variants   = await tx.variant.findMany({
          where:   { id: { in: variantIds } },
          include: { product: { select: { title: true, images: true, businessId: true } } },
        });

        // Validate stock + collect businessIds for notifications
        const involvedBusinessIds = new Set<string>();
        for (const item of itemsWithCustomization) {
          const variant = variants.find((v) => v.id === item.variantId);
          if (!variant) throw new NotFoundException(`Variant ${item.variantId} not found.`);
          if (variant.stock < item.quantity) {
            throw new BadRequestException(`Insufficient stock for ${variant.product.title}.`);
          }
          if (variant.product.businessId) {
            involvedBusinessIds.add(variant.product.businessId);
          }
        }

        const orderNumber = `ORD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
        this.logger.log(`[VERIFY] Creating order: ${orderNumber}`);

        // Create Order
        const createdOrder = await tx.order.create({
          data: {
            customerUserId:  orderInitiate.customerUserId,
            orderNumber,
            totalAmount:     verifiedPriceDetails.totalAmount,
            discount:        verifiedPriceDetails.discountAmount,
            shippingFee:     verifiedPriceDetails.shippingFee,
            paymentMethod:   PaymentMethod.online,
            paymentStatus:   PaymentStatus.completed,
            status:          OrderStatus.pending,
            selectedAddress: selectedAddress as Prisma.InputJsonValue,
            items: {
              create: itemsWithCustomization.map((item) => {
                const variant = variants.find((v) => v.id === item.variantId)!;
                return {
                  productId:            variant.productId,
                  variantId:            item.variantId,
                  businessId:           variant.product.businessId,
                  quantity:             item.quantity,
                  priceAtTimeOfOrder:   variant.price,
                  customizationDetails: item.customizationDetails ?? Prisma.JsonNull,
                  customizationImages:  item.customizationImages  ?? [],
                };
              }),
            },
          },
        });

        // Decrement stock
        for (const item of itemsWithCustomization) {
          await tx.variant.update({
            where: { id: item.variantId },
            data:  { stock: { decrement: item.quantity } },
          });
        }

        // Clear cart
        const deleted = await tx.cartItem.deleteMany({
          where: {
            customerUserId: orderInitiate.customerUserId,
            variantId: { in: variantIds },
          },
        });
        this.logger.debug(`[VERIFY] Cleared ${deleted.count} cart items`);

        // Notify customer
        await tx.customerNotification.create({
          data: {
            customerUserId: orderInitiate.customerUserId,
            title:          'Order Placed Successfully',
            message:        `Your order ${orderNumber} has been placed for ₹${verifiedPriceDetails.totalAmount}.`,
            type:           NotificationType.ORDER,
            metadata:       { orderId: createdOrder.id, orderNumber },
          },
        });

        // Notify sellers
        if (involvedBusinessIds.size > 0) {
          const sellers = await tx.user.findMany({
            where: {
              businesses: { some: { id: { in: Array.from(involvedBusinessIds) } } },
            },
            select: { id: true },
          });

          for (const seller of sellers) {
            await tx.sellerNotification.create({
              data: {
                userId:  seller.id,
                title:   'New Online Order',
                message: `New order received: ${orderNumber}.`,
                type:    NotificationType.ORDER,
                metadata: { orderId: createdOrder.id, orderNumber },
              },
            });
          }
        }

        // Return final order with details
        return tx.order.findUnique({
          where:  { id: createdOrder.id },
          select: {
            id:              true,
            orderNumber:     true,
            createdAt:       true,
            totalAmount:     true,
            selectedAddress: true,
            couponCode:      true,
            couponDiscount:  true,
            items: {
              select: {
                quantity:             true,
                priceAtTimeOfOrder:   true,
                customizationDetails: true,
                customizationImages:  true,
                variant: {
                  select: {
                    id:  true,
                    sku: true,
                    product: {
                      select: { title: true, images: true },
                    },
                  },
                },
              },
            },
          },
        });
      });

      if (!finalOrder) {
        throw new InternalServerErrorException('Failed to retrieve order after creation.');
      }

      this.logger.log(`[VERIFY] Success: ${finalOrder.orderNumber}`);

      return {
        success: true,
        message: 'Payment verified and order created successfully.',
        order: {
          id:              finalOrder.id,
          orderNumber:     finalOrder.orderNumber,
          createdAt:       finalOrder.createdAt,
          totalAmount:     finalOrder.totalAmount,
          selectedAddress: finalOrder.selectedAddress,
          couponCode:      finalOrder.couponCode   ?? null,
          couponDiscount:  finalOrder.couponDiscount ?? null,
          items: finalOrder.items.map((item) => ({
            productName:          item.variant?.product?.title ?? 'Unknown product',
            imageUrl:             item.variant?.product?.images?.[0] ?? null,
            quantity:             item.quantity,
            price:                item.priceAtTimeOfOrder,
            customizationDetails: item.customizationDetails,
            customizationImages:  item.customizationImages,
          })),
        },
      };

    } catch (error: unknown) {
      this.logger.error(`[VERIFY] Transaction failed:`, (error as Error).stack);

      // Auto-refund on system failure
      this.logger.warn(`[VERIFY] Initiating refund for payment: ${razorpay_payment_id}`);
      try {
        const refund = await this.razorpay.payments.refund(razorpay_payment_id, {
          amount: Number(razorpayOrder.amount),
          notes:  { reason: 'Order creation failed after successful payment.' },
        });
        this.logger.log(`[VERIFY] Refund initiated: ${refund.id}`);
      } catch (refundError: unknown) {
        this.logger.error(`[VERIFY] Refund failed:`, (refundError as Error).stack);
      }

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to create order after payment. A refund has been initiated.',
      );
    }
  }

  // ───────────────────────────────────────────────────────
  // PRIVATE: Calculate Order Total
  // ───────────────────────────────────────────────────────
  private async calculateOrderTotal(dto: {
    items: Array<{
      variantId:            string;
      quantity:             number;
      customizationDetails?: Prisma.JsonValue;
      customizationImages?:  string[];
    }>;
    couponCode?:   string;
    destStateCode: string;   // customer's destination state code
  }): Promise<PriceDetails> {
    const { items, couponCode, destStateCode } = dto;

    // Fetch variants with weight, dimensions, and seller businessId
    const variantIds = items.map((i) => i.variantId);
    const variants   = await this.prisma.variant.findMany({
      where:   { id: { in: variantIds } },
      include: {
        product: {
          select: { businessId: true, title: true },
        },
      },
    });

    if (variants.length !== new Set(variantIds).size) {
      throw new NotFoundException('One or more product variants not found.');
    }

    // Subtotal
    let subtotal = 0;
    for (const item of items) {
      const variant = variants.find((v) => v.id === item.variantId);
      if (!variant) throw new NotFoundException(`Variant ${item.variantId} not found.`);
      subtotal += variant.price.toNumber() * item.quantity;
    }

    // Coupon discount
    let discountAmount = 0;
    let appliedCoupon: PriceDetails['appliedCoupon'] | undefined;

    if (couponCode) {
      const coupon = await this.prisma.coupon.findUnique({
        where:   { code: couponCode },
        include: { discount: true },
      });

      if (!coupon?.active || !coupon.discount) {
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
        if (
          discount.maxDiscountAmount &&
          discountAmount > discount.maxDiscountAmount.toNumber()
        ) {
          discountAmount = discount.maxDiscountAmount.toNumber();
        }
      } else if (discount.discountType === DiscountType.fixed_amount) {
        discountAmount = Math.min(discount.discountValue.toNumber(), subtotal);
      }
      // free_shipping: discountAmount stays 0, handled in shippingFee below

      appliedCoupon = {
        code:          coupon.code,
        discountValue: discount.discountValue.toNumber(),
        discountType:  discount.discountType,
      };
    }

    // ── Xpressbees Shipping (per-seller, separate shipments) ──
    let shippingFee = 0;

    if (appliedCoupon?.discountType !== DiscountType.free_shipping) {
      const shipmentItems: ShipmentLineItem[] = items.map((item) => {
        const variant = variants.find((v) => v.id === item.variantId)!;
        return {
          businessId:    variant.product.businessId,
          weightInGrams: variant.weightInGrams ?? 500, // fallback 500g
          length:        variant.length  ? variant.length.toString()  : null,
          width:         variant.width   ? variant.width.toString()   : null,
          height:        variant.height  ? variant.height.toString()  : null,
          quantity:      item.quantity,
        };
      });

      shippingFee = calculateTotalShipping(shipmentItems, destStateCode);
      this.logger.debug(
        `[CALC] Shipping: ₹${shippingFee} for destCode=${destStateCode}`,
      );
    } else {
      this.logger.debug('[CALC] Free shipping (coupon)');
    }

    const totalAmount = Math.max(
      subtotal - discountAmount + shippingFee + PLATFORM_FEE+PACKAGING_FEE,
      0,
    );

    return {
      subtotal:       parseFloat(subtotal.toFixed(2)),
      shippingFee:    parseFloat(shippingFee.toFixed(2)),
      packagingFee:   parseFloat(PACKAGING_FEE.toFixed(2)),
      platformFee:    PLATFORM_FEE,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      totalAmount:    parseFloat(totalAmount.toFixed(2)),
      appliedCoupon,
    };
  }
}
