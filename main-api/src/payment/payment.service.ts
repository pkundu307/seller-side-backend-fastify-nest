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

// Define a type for the detailed price breakdown
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
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    @Inject(RAZORPAY_INSTANCE) private razorpay: Razorpay,
  ) {}

  /**
   * 1. Initiate Order: Fetches cart items with customization and creates Razorpay order
   */
  async initiateOrder(customerUserId: string, dto: CreatePaymentInitiationDto) {
    this.logger.log(`[INITIATE_ORDER] Starting order initiation for user: ${customerUserId}`);
    this.logger.debug(`[INITIATE_ORDER] Variant IDs: ${JSON.stringify(dto.items.map(i => i.variantId))}`);

    try {
      // ✅ FETCH CART ITEMS WITH CUSTOMIZATION FROM DATABASE
      const variantIds = dto.items.map(item => item.variantId);
      const cartItems = await this.prisma.cartItem.findMany({
        where: {
          customerUserId: customerUserId,
          variantId: { in: variantIds }
        },
        include: {
          variant: {
            include: {
              product: true
            }
          }
        }
      });

      if (cartItems.length !== variantIds.length) {
        this.logger.error(`[INITIATE_ORDER] Cart items mismatch. Expected: ${variantIds.length}, Found: ${cartItems.length}`);
        throw new BadRequestException('One or more cart items not found.');
      }

      this.logger.debug(`[INITIATE_ORDER] Fetched ${cartItems.length} cart items with customization`);

      // Map cart items to include customization
      const itemsWithCustomization = cartItems.map(cartItem => {
        const dtoItem = dto.items.find(i => i.variantId === cartItem.variantId);
        return {
          variantId: cartItem.variantId,
          quantity: dtoItem?.quantity || cartItem.quantity,
          customizationDetails: cartItem.customizationDetails,
          customizationImages: cartItem.customizationImages,
        };
      });

      // Calculate price details
      const priceDetails = await this.calculateOrderTotal({
        items: itemsWithCustomization,
        couponCode: dto.couponCode
      });
      this.logger.log(`[INITIATE_ORDER] Price calculated: ${JSON.stringify(priceDetails)}`);

      const options = {
        amount: Math.round(priceDetails.totalAmount * 100),
        currency: 'INR',
        receipt: `receipt_order_${Date.now()}`,
      };

      // Create Razorpay order
      const razorpayOrder = await this.razorpay.orders.create(options);
      this.logger.log(`[INITIATE_ORDER] Razorpay order created: ${razorpayOrder.id}`);

      // Save customization details from cart in the DB
      await this.prisma.orderInitiate.create({
        data: {
          orderId: razorpayOrder.id,
          status: 'pending',
          customerUserId: customerUserId,
          details: {
            items: itemsWithCustomization, // ✅ Contains customization from CartItem
            couponCode: dto.couponCode,
            priceDetails: priceDetails,
          } as any,
        },
      });
      this.logger.log(`[INITIATE_ORDER] Order initiation saved to DB with customization data`);

      return { razorpayOrder, priceDetails };
    } catch (error) {
      this.logger.error(`[INITIATE_ORDER] Failed:`, error.stack);
      throw error;
    }
  }

  /**
   * 2. Verify Payment: Finalizes the order and maps customization to OrderItems
   */
  async verifyPayment(dto: VerifyPaymentDto) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = dto;
    this.logger.log(`[VERIFY_PAYMENT] Starting verification for order: ${razorpay_order_id}`);
    
    const razorpaySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    
    if (!razorpaySecret) {
      this.logger.error('[VERIFY_PAYMENT] Razorpay secret key not configured');
      throw new InternalServerErrorException('Razorpay secret key is not configured.');
    }

    // 1. Verify Signature
    this.logger.debug('[VERIFY_PAYMENT] Verifying signature');
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', razorpaySecret)
      .update(body.toString())
      .digest('hex');
    
    if (expectedSignature !== razorpay_signature) {
      this.logger.warn(`[VERIFY_PAYMENT] Invalid signature for order: ${razorpay_order_id}`);
      throw new BadRequestException('Invalid Razorpay signature.');
    }
    this.logger.log('[VERIFY_PAYMENT] Signature verified');

    // 2. Find OrderInitiate record
    const orderInitiate = await this.prisma.orderInitiate.findFirst({
      where: { orderId: razorpay_order_id },
    });
    
    if (!orderInitiate) {
      this.logger.error(`[VERIFY_PAYMENT] Order initiation not found: ${razorpay_order_id}`);
      throw new NotFoundException(`Order initiation record not found.`);
    }
    this.logger.log(`[VERIFY_PAYMENT] Order initiation found for user: ${orderInitiate.customerUserId}`);

    // 3. Extract details with customization
    const details = orderInitiate.details as any;
    if (!details || !details.items) {
      this.logger.error(`[VERIFY_PAYMENT] Corrupt order data`);
      throw new InternalServerErrorException('Order initiation data is corrupt.');
    }

    // ✅ Items now contain customization from CartItem
    const itemsWithCustomization = details.items;
    this.logger.debug(`[VERIFY_PAYMENT] Extracted ${itemsWithCustomization.length} items with customization`);

    const itemsDto = { 
      items: itemsWithCustomization, 
      couponCode: details.couponCode 
    };
    
    // Recalculate and verify price
    const verifiedPriceDetails = await this.calculateOrderTotal(itemsDto);
    this.logger.debug(`[VERIFY_PAYMENT] Verified price: ${JSON.stringify(verifiedPriceDetails)}`);
    
    // Verify amount with Razorpay
    const razorpayOrder = await this.razorpay.orders.fetch(razorpay_order_id);
    if (Math.round(verifiedPriceDetails.totalAmount * 100) !== razorpayOrder.amount) {
      this.logger.error(`[VERIFY_PAYMENT] Price mismatch - Expected: ${razorpayOrder.amount}, Got: ${Math.round(verifiedPriceDetails.totalAmount * 100)}`);
      throw new InternalServerErrorException('Price mismatch during verification.');
    }
    this.logger.log('[VERIFY_PAYMENT] Price verification passed');
    
    // Get default address
    const defaultAddress = await this.prisma.address.findFirst({
      where: { customerUserId: orderInitiate.customerUserId, isDefault: true },
    });
    
    if (!defaultAddress) {
      this.logger.error(`[VERIFY_PAYMENT] No default address for user: ${orderInitiate.customerUserId}`);
      throw new BadRequestException('No default address found for this user.');
    }

    // 4. Execute the final order creation in a database transaction
    this.logger.log('[VERIFY_PAYMENT] Starting database transaction');
    try {
      const finalOrderWithDetails = await this.prisma.$transaction(async (tx) => {
        // Mark initiation as completed
        await tx.orderInitiate.update({
          where: { id: orderInitiate.id },
          data: { status: 'completed' },
        });
        this.logger.debug('[VERIFY_PAYMENT] [TXN] Order initiation marked as completed');

        // Fetch variants and check stock
        const variantIds = itemsWithCustomization.map(item => item.variantId);
        const variants = await tx.variant.findMany({
          where: { id: { in: variantIds } },
          include: { product: true }
        });
        this.logger.debug(`[VERIFY_PAYMENT] [TXN] Fetched ${variants.length} variants`);

        // Validate stock availability
        const involvedBusinessIds = new Set<string>();
        for (const item of itemsWithCustomization) {
          const variant = variants.find(v => v.id === item.variantId);
          if (!variant) {
            this.logger.error(`[VERIFY_PAYMENT] [TXN] Variant not found: ${item.variantId}`);
            throw new NotFoundException(`Variant ${item.variantId} not found.`);
          }
          if (variant.stock < item.quantity) {
            this.logger.error(`[VERIFY_PAYMENT] [TXN] Insufficient stock for variant: ${item.variantId}`);
            throw new BadRequestException(`Insufficient stock for ${variant.product.title}.`);
          }
          // Collect business IDs for notifications
          if (variant.product.businessId) {
            involvedBusinessIds.add(variant.product.businessId);
          }
        }
        this.logger.log(`[VERIFY_PAYMENT] [TXN] Stock validation passed. ${involvedBusinessIds.size} businesses involved`);

        // Generate order number
        const orderNumber = `ORD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
        this.logger.log(`[VERIFY_PAYMENT] [TXN] Creating order: ${orderNumber}`);

        // Create the Order with customization
        const createdOrder = await tx.order.create({
          data: {
            customerUserId: orderInitiate.customerUserId,
            orderNumber: orderNumber,
            totalAmount: verifiedPriceDetails.totalAmount,
            discount: verifiedPriceDetails.discountAmount,
            shippingFee: verifiedPriceDetails.shippingFee,
            paymentMethod: PaymentMethod.online,
            paymentStatus: PaymentStatus.completed,
            status: OrderStatus.pending,
            selectedAddress: defaultAddress as any,
            items: {
              create: itemsWithCustomization.map(item => {
                const variant = variants.find(v => v.id === item.variantId)!;
                this.logger.debug(`[VERIFY_PAYMENT] [TXN] Creating order item with customization: ${JSON.stringify({
                  variantId: item.variantId,
                  hasCustomizationDetails: !!item.customizationDetails,
                  customizationImagesCount: item.customizationImages?.length || 0
                })}`);
                
                return {
                  productId: variant.productId,
                  variantId: item.variantId,
                  quantity: item.quantity,
                  priceAtTimeOfOrder: variant.price,
                  // ✅ CUSTOMIZATION FROM CART ITEM (via OrderInitiate)
                  customizationDetails: item.customizationDetails || Prisma.JsonNull,
                  customizationImages: item.customizationImages || [],
                };
              }),
            },
          }
        });
        this.logger.log(`[VERIFY_PAYMENT] [TXN] Order created with ID: ${createdOrder.id}`);
        
        // Decrement stock
        for (const item of itemsWithCustomization) {
          await tx.variant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } },
          });
        }
        this.logger.debug(`[VERIFY_PAYMENT] [TXN] Stock decremented for ${itemsWithCustomization.length} items`);
        //delete images from s3 used for customization
        


        // Clear cart
        const deleteResult = await tx.cartItem.deleteMany({
          where: {
            customerUserId: orderInitiate.customerUserId,
            variantId: { in: variantIds },
          },
        });
        this.logger.debug(`[VERIFY_PAYMENT] [TXN] Deleted ${deleteResult.count} cart items`);

        // ✅ SEND NOTIFICATIONS
        this.logger.debug('[VERIFY_PAYMENT] [TXN] Creating notifications');
        
        // Notify Customer
        await tx.customerNotification.create({
          data: {
            customerUserId: orderInitiate.customerUserId,
            title: 'Order Placed Successfully',
            message: `Your order ${orderNumber} has been placed successfully for ₹${verifiedPriceDetails.totalAmount}.`,
            type: NotificationType.ORDER,
            metadata: { orderId: createdOrder.id, orderNumber: orderNumber },
          },
        });
        this.logger.debug('[VERIFY_PAYMENT] [TXN] Customer notification created');

        // Notify Sellers
        if (involvedBusinessIds.size > 0) {
          const businessIdsArray = Array.from(involvedBusinessIds);
          const sellers = await tx.user.findMany({
            where: {
              businesses: {
                some: { id: { in: businessIdsArray } }
              }
            },
            select: { id: true }
          });

          for (const seller of sellers) {
            await tx.sellerNotification.create({
              data: {
                userId: seller.id,
                title: 'New Online Order',
                message: `You have received a new online order ${orderNumber}.`,
                type: NotificationType.ORDER,
                metadata: { orderId: createdOrder.id, orderNumber: orderNumber },
              },
            });
          }
          this.logger.debug(`[VERIFY_PAYMENT] [TXN] Seller notifications created for ${sellers.length} sellers`);
        }

        // Re-fetch the newly created order with all details
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
                customizationDetails: true,
                customizationImages: true,
                variant: {
                  select: {
                    id: true,
                    sku: true,
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

      // Type safety check
      if (!finalOrderWithDetails) {
        this.logger.error('[VERIFY_PAYMENT] Failed to retrieve order details after creation');
        throw new InternalServerErrorException('Failed to retrieve order details after creation.');
      }

      this.logger.log(`[VERIFY_PAYMENT] Transaction completed successfully for order: ${finalOrderWithDetails.orderNumber}`);

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
            const productName = item.variant?.product?.title || 'Product information unavailable';
            const imageUrl = item.variant?.product?.images?.[0] || null;

            return {
              productName,
              imageUrl,
              quantity: item.quantity,
              price: item.priceAtTimeOfOrder,
              customizationDetails: item.customizationDetails,
              customizationImages: item.customizationImages,
            };
          }),
        },
      };

    } catch (error) {
      this.logger.error(`[VERIFY_PAYMENT] Transaction failed:`, error.stack);
      
      // Automatically refund the payment if our system fails
      this.logger.warn(`[VERIFY_PAYMENT] Attempting refund for payment: ${razorpay_payment_id}`);
      try {
        const refund = await this.razorpay.payments.refund(razorpay_payment_id, {
          amount: razorpayOrder.amount,
          notes: { reason: 'Order creation failed in our system after successful payment.' }
        });
        this.logger.log(`[VERIFY_PAYMENT] Refund initiated: ${refund.id}`);
      } catch (refundError) {
        this.logger.error(`[VERIFY_PAYMENT] Refund failed:`, refundError.stack);
      }
      
      // Re-throw the original error or a sanitized version
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      
      throw new InternalServerErrorException(
        'Failed to create order after payment. The payment has been refunded. Please try again.'
      );
    }
  }

  /**
   * Private helper to calculate order totals with discount and shipping
   */
  private async calculateOrderTotal(dto: any): Promise<PriceDetails> {
    const { items, couponCode } = dto;
    this.logger.debug(`[CALCULATE_TOTAL] Calculating for ${items.length} items`);

    // Fetch all variants
    const variantIds = items.map(item => item.variantId);
    const variants = await this.prisma.variant.findMany({
      where: { id: { in: variantIds } },
    });

    if (variants.length !== new Set(variantIds).size) {
      this.logger.error(`[CALCULATE_TOTAL] Variant count mismatch`);
      throw new NotFoundException('One or more product variants not found.');
    }

    // Calculate subtotal
    let subtotal = 0;
    for (const item of items) {
      const variant = variants.find(v => v.id === item.variantId);
      if (!variant) {
        throw new NotFoundException(`Variant with ID ${item.variantId} not found.`);
      }
      subtotal += variant.price.toNumber() * item.quantity;
    }
    this.logger.debug(`[CALCULATE_TOTAL] Subtotal: ₹${subtotal}`);

    // Apply coupon discount
    let discountAmount = 0;
    let appliedCoupon: PriceDetails['appliedCoupon'] | undefined = undefined;

    if (couponCode) {
      this.logger.debug(`[CALCULATE_TOTAL] Applying coupon: ${couponCode}`);
      
      const coupon = await this.prisma.coupon.findUnique({
        where: { code: couponCode },
        include: { discount: true },
      });

      if (!coupon || !coupon.active || !coupon.discount) {
        this.logger.warn(`[CALCULATE_TOTAL] Invalid coupon: ${couponCode}`);
        throw new BadRequestException('Invalid or inactive coupon code.');
      }
      
      if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        throw new BadRequestException('This coupon has expired.');
      }
      
      if (coupon.discount.minOrderAmount && subtotal < coupon.discount.minOrderAmount.toNumber()) {
        throw new BadRequestException(
          `Minimum order amount of ₹${coupon.discount.minOrderAmount} is required.`
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
      }
      
      this.logger.log(`[CALCULATE_TOTAL] Discount: ₹${discountAmount}`);
      
      appliedCoupon = {
        code: coupon.code,
        discountValue: discount.discountValue.toNumber(),
        discountType: discount.discountType,
      };
    }

    // Calculate shipping fee
    let shippingFee = 0;
    const amountAfterDiscount = subtotal - discountAmount;
    
    if (appliedCoupon?.discountType !== DiscountType.free_shipping) {
      if (amountAfterDiscount < 500) {
        shippingFee = 40;
        this.logger.debug(`[CALCULATE_TOTAL] Shipping fee: ₹${shippingFee}`);
      } else {
        this.logger.debug('[CALCULATE_TOTAL] Free shipping (order above ₹500)');
      }
    } else {
      this.logger.debug('[CALCULATE_TOTAL] Free shipping (coupon)');
    }

    const totalAmount = subtotal - discountAmount + shippingFee;

    const priceDetails = {
      subtotal: parseFloat(subtotal.toFixed(2)),
      shippingFee: parseFloat(shippingFee.toFixed(2)),
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      totalAmount: totalAmount > 0 ? parseFloat(totalAmount.toFixed(2)) : 0,
      appliedCoupon,
    };

    this.logger.log(`[CALCULATE_TOTAL] Total: ₹${priceDetails.totalAmount}`);
    return priceDetails;
  }
}
