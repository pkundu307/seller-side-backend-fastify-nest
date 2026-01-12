"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const razorpay_provider_1 = require("./razorpay.provider");
const razorpay_1 = require("razorpay");
const crypto = require("crypto");
const client_1 = require("@prisma/client");
const client_2 = require("@prisma/client");
let PaymentService = class PaymentService {
    prisma;
    configService;
    razorpay;
    constructor(prisma, configService, razorpay) {
        this.prisma = prisma;
        this.configService = configService;
        this.razorpay = razorpay;
    }
    async initiateOrder(customerUserId, dto) {
        const priceDetails = await this.calculateOrderTotal(dto);
        const options = {
            amount: Math.round(priceDetails.totalAmount * 100),
            currency: 'INR',
            receipt: `receipt_order_${new Date().getTime()}`,
        };
        const razorpayOrder = await this.razorpay.orders.create(options);
        await this.prisma.orderInitiate.create({
            data: {
                orderId: razorpayOrder.id,
                status: 'pending',
                customerUserId: customerUserId,
                details: {
                    items: dto.items,
                    couponCode: dto.couponCode,
                    priceDetails: priceDetails,
                },
            },
        });
        return { razorpayOrder, priceDetails };
    }
    async calculateOrderTotal(dto) {
        const { items, couponCode } = dto;
        const variantIds = items.map(item => item.variantId);
        const variants = await this.prisma.variant.findMany({
            where: { id: { in: variantIds } },
        });
        if (variants.length !== new Set(variantIds).size) {
            throw new common_1.NotFoundException('One or more product variants not found.');
        }
        let subtotal = 0;
        for (const item of items) {
            const variant = variants.find(v => v.id === item.variantId);
            if (!variant) {
                throw new common_1.NotFoundException(`Could not find variant with ID ${item.variantId} during calculation.`);
            }
            subtotal += variant.price.toNumber() * item.quantity;
        }
        let discountAmount = 0;
        let appliedCoupon = undefined;
        if (couponCode) {
            const coupon = await this.prisma.coupon.findUnique({
                where: { code: couponCode },
                include: { discount: true },
            });
            if (!coupon || !coupon.active || !coupon.discount) {
                throw new common_1.BadRequestException('Invalid or inactive coupon code.');
            }
            if (coupon.expiresAt && coupon.expiresAt < new Date()) {
                throw new common_1.BadRequestException('This coupon has expired.');
            }
            if (coupon.discount.minOrderAmount && subtotal < coupon.discount.minOrderAmount.toNumber()) {
                throw new common_1.BadRequestException(`Minimum order amount of ₹${coupon.discount.minOrderAmount} is required.`);
            }
            const { discount } = coupon;
            if (discount.discountType === client_2.DiscountType.percentage) {
                discountAmount = (subtotal * discount.discountValue.toNumber()) / 100;
                if (discount.maxDiscountAmount && discountAmount > discount.maxDiscountAmount.toNumber()) {
                    discountAmount = discount.maxDiscountAmount.toNumber();
                }
            }
            else if (discount.discountType === client_2.DiscountType.fixed_amount) {
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
        if (appliedCoupon?.discountType !== client_2.DiscountType.free_shipping) {
            if (amountAfterDiscount < 500) {
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
    async verifyPayment(dto) {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = dto;
        const razorpaySecret = this.configService.get('RAZORPAY_KEY_SECRET');
        if (!razorpaySecret) {
            throw new common_1.InternalServerErrorException('Razorpay secret key is not configured.');
        }
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto.createHmac('sha256', razorpaySecret).update(body.toString()).digest('hex');
        if (expectedSignature !== razorpay_signature) {
            throw new common_1.BadRequestException('Invalid Razorpay signature.');
        }
        const orderInitiate = await this.prisma.orderInitiate.findFirst({
            where: { orderId: razorpay_order_id },
        });
        if (!orderInitiate) {
            throw new common_1.NotFoundException(`Order initiation record not found.`);
        }
        const details = orderInitiate.details;
        if (!details || !details.items) {
            throw new common_1.InternalServerErrorException("Order initiation data is corrupt.");
        }
        const itemsDto = { items: details.items, couponCode: details.couponCode };
        const verifiedPriceDetails = await this.calculateOrderTotal(itemsDto);
        const razorpayOrder = await this.razorpay.orders.fetch(razorpay_order_id);
        if (Math.round(verifiedPriceDetails.totalAmount * 100) !== razorpayOrder.amount) {
            throw new common_1.InternalServerErrorException("Price mismatch during verification.");
        }
        const defaultAddress = await this.prisma.address.findFirst({
            where: { customerUserId: orderInitiate.customerUserId, isDefault: true },
        });
        if (!defaultAddress) {
            throw new common_1.BadRequestException("No default address found for this user.");
        }
        try {
            const finalOrderWithDetails = await this.prisma.$transaction(async (tx) => {
                await tx.orderInitiate.update({
                    where: { id: orderInitiate.id },
                    data: { status: 'completed' },
                });
                const variantIds = itemsDto.items.map(item => item.variantId);
                const variants = await tx.variant.findMany({
                    where: { id: { in: variantIds } },
                    select: { id: true, price: true, productId: true, stock: true }
                });
                for (const item of itemsDto.items) {
                    const variant = variants.find(v => v.id === item.variantId);
                    if (!variant || variant.stock < item.quantity) {
                        throw new common_1.BadRequestException(`Insufficient stock for one or more items.`);
                    }
                }
                const createdOrder = await tx.order.create({
                    data: {
                        customerUserId: orderInitiate.customerUserId,
                        orderNumber: `ORD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
                        totalAmount: verifiedPriceDetails.totalAmount,
                        discount: verifiedPriceDetails.discountAmount,
                        shippingFee: verifiedPriceDetails.shippingFee,
                        paymentMethod: client_1.PaymentMethod.online,
                        paymentStatus: client_1.PaymentStatus.completed,
                        status: client_1.OrderStatus.pending,
                        selectedAddress: defaultAddress,
                        items: {
                            create: itemsDto.items.map(item => {
                                const variant = variants.find(v => v.id === item.variantId);
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
                for (const item of itemsDto.items) {
                    await tx.variant.update({
                        where: { id: item.variantId },
                        data: { stock: { decrement: item.quantity } },
                    });
                }
                const cartItemVariantIds = itemsDto.items.map(i => i.variantId);
                await tx.cartItem.deleteMany({
                    where: {
                        customerUserId: orderInitiate.customerUserId,
                        variantId: { in: cartItemVariantIds },
                    },
                });
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
                                variant: {
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
            if (!finalOrderWithDetails) {
                throw new common_1.InternalServerErrorException('Failed to retrieve order details after creation.');
            }
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
                        if (!item.variant || !item.variant.product) {
                            return {
                                productName: 'Product information unavailable',
                                imageUrl: null,
                                quantity: item.quantity,
                                price: item.priceAtTimeOfOrder,
                            };
                        }
                        return {
                            productName: item.variant.product.title,
                            imageUrl: item.variant.product.images.length > 0 ? item.variant.product.images[0] : null,
                            quantity: item.quantity,
                            price: item.priceAtTimeOfOrder,
                        };
                    }),
                },
            };
        }
        catch (error) {
            console.error('[VERIFY_PAYMENT] Transaction failed:', error);
            await this.razorpay.payments.refund(razorpay_payment_id, {
                amount: razorpayOrder.amount,
                notes: { reason: "Order creation failed in our system after successful payment." }
            });
            throw new common_1.InternalServerErrorException('Failed to create order after payment. The payment has been refunded. Please try again.');
        }
    }
};
exports.PaymentService = PaymentService;
exports.PaymentService = PaymentService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(razorpay_provider_1.RAZORPAY_INSTANCE)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        razorpay_1.default])
], PaymentService);
//# sourceMappingURL=payment.service.js.map