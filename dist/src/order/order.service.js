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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const library_1 = require("@prisma/client/runtime/library");
function generateOrderNumber() {
    return `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
}
let OrdersService = class OrdersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createCashOnDeliveryOrder(customerUserId, dto) {
        if (dto.paymentMethod !== 'cash_on_delivery') {
            throw new common_1.BadRequestException('This endpoint only supports "cash_on_delivery" orders.');
        }
        if (!dto.cartItemIds || dto.cartItemIds.length === 0) {
            throw new common_1.BadRequestException('No items selected for checkout.');
        }
        const cartItems = await this.prisma.cartItem.findMany({
            where: {
                customerUserId,
                id: { in: dto.cartItemIds }
            },
            include: {
                variant: {
                    include: {
                        product: true,
                    }
                },
            },
        });
        if (cartItems.length !== new Set(dto.cartItemIds).size) {
            throw new common_1.BadRequestException('One or more selected items are invalid.');
        }
        let totalAmount = new library_1.Decimal(0);
        const involvedBusinessIds = new Set();
        for (const item of cartItems) {
            if (!item.variant)
                throw new common_1.NotFoundException(`Variant missing for item ${item.id}`);
            const itemTotal = new library_1.Decimal(item.variant.price).times(item.quantity);
            totalAmount = totalAmount.plus(itemTotal);
            if (item.variant.product.businessId) {
                involvedBusinessIds.add(item.variant.product.businessId);
            }
        }
        if (dto.shippingFee)
            totalAmount = totalAmount.plus(dto.shippingFee);
        if (dto.taxAmount)
            totalAmount = totalAmount.plus(dto.taxAmount);
        if (dto.discount)
            totalAmount = totalAmount.minus(dto.discount);
        const orderNum = generateOrderNumber();
        return this.prisma.$transaction(async (tx) => {
            const newOrder = await tx.order.create({
                data: {
                    customerUserId,
                    totalAmount,
                    selectedAddress: dto.selectedAddress ?? {},
                    paymentMethod: 'cash_on_delivery',
                    paymentStatus: client_1.PaymentStatus.pending,
                    status: client_1.OrderStatus.pending,
                    shippingFee: dto.shippingFee || 0,
                    taxAmount: dto.taxAmount || 0,
                    discount: dto.discount || 0,
                    orderNumber: orderNum,
                },
            });
            const orderItemsData = cartItems.map((item) => ({
                orderId: newOrder.id,
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity,
                priceAtTimeOfOrder: item.variant.price,
                customizationImages: item.customizationImages,
                customizationDetails: item.customizationDetails ?? undefined,
            }));
            await tx.orderItem.createMany({ data: orderItemsData });
            await tx.cartItem.deleteMany({
                where: { customerUserId, id: { in: dto.cartItemIds } },
            });
            await tx.customerNotification.create({
                data: {
                    customerUserId: customerUserId,
                    title: 'Order Placed',
                    message: `Order ${orderNum} placed successfully for ₹${totalAmount}.`,
                    type: client_1.NotificationType.ORDER,
                    metadata: { orderId: newOrder.id, orderNumber: orderNum },
                },
            });
            const businessIdsArray = Array.from(involvedBusinessIds);
            if (businessIdsArray.length > 0) {
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
                            title: 'New COD Order',
                            message: `You have received a new COD order ${orderNum}.`,
                            type: client_1.NotificationType.ORDER,
                            metadata: { orderId: newOrder.id },
                        },
                    });
                }
            }
            return newOrder;
        });
    }
    async getOrderSuccessDetails(customerUserId, orderId) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    include: {
                        variant: {
                            include: {
                                product: {
                                    select: { title: true, images: true, slug: true }
                                }
                            }
                        }
                    }
                }
            }
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found.');
        }
        if (order.customerUserId !== customerUserId) {
            throw new common_1.ForbiddenException('Access denied.');
        }
        return {
            success: true,
            orderId: order.id,
            orderNumber: order.orderNumber,
            createdAt: order.createdAt,
            totalAmount: order.totalAmount,
            paymentMethod: order.paymentMethod,
            deliveryAddress: order.selectedAddress,
            estimatedDeliveryDate: order.estimatedDeliveryDate,
            items: order.items.map(item => ({
                id: item.id,
                quantity: item.quantity,
                price: item.priceAtTimeOfOrder,
                productName: item.variant?.product.title || 'Product Unavailable',
                productImage: item.variant?.product.images?.[0] || '',
            }))
        };
    }
    async findAllByCustomer(customerUserId) {
        const orders = await this.prisma.order.findMany({
            where: {
                customerUserId: customerUserId,
            },
            orderBy: {
                createdAt: 'desc',
            },
            select: {
                id: true,
                orderNumber: true,
                status: true,
                paymentStatus: true,
                paymentMethod: true,
                totalAmount: true,
                createdAt: true,
                estimatedDeliveryDate: true,
                selectedAddress: true,
                items: {
                    select: {
                        id: true,
                        quantity: true,
                        priceAtTimeOfOrder: true,
                        variant: {
                            select: {
                                sku: true,
                                product: {
                                    select: {
                                        title: true,
                                        images: true,
                                        slug: true,
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        return orders.map(order => ({
            ...order,
            itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
            items: order.items.map(item => ({
                id: item.id,
                quantity: item.quantity,
                price: item.priceAtTimeOfOrder,
                productName: item.variant?.product?.title || 'Product Unavailable',
                productImage: item.variant?.product?.images?.[0] || null,
                productSlug: item.variant?.product?.slug || null,
                variantSku: item.variant?.sku || 'N/A'
            }))
        }));
    }
    async findOneByCustomer(customerUserId, orderId) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    include: {
                        variant: {
                            include: {
                                product: {
                                    select: {
                                        title: true,
                                        images: true,
                                        slug: true,
                                        business: {
                                            select: {
                                                name: true,
                                                id: true,
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found.');
        }
        if (order.customerUserId !== customerUserId) {
            throw new common_1.ForbiddenException('You are not authorized to view this order.');
        }
        return {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
            createdAt: order.createdAt,
            totalAmount: order.totalAmount,
            subtotal: order.totalAmount
                .minus(order.shippingFee)
                .minus(order.taxAmount)
                .plus(order.discount),
            shippingFee: order.shippingFee,
            taxAmount: order.taxAmount,
            discount: order.discount,
            selectedAddress: order.selectedAddress,
            estimatedDeliveryDate: order.estimatedDeliveryDate,
            trackingNumber: order.trackingNumber,
            items: order.items.map(item => {
                const product = item.variant?.product;
                const business = product?.business;
                return {
                    id: item.id,
                    quantity: item.quantity,
                    price: item.priceAtTimeOfOrder,
                    total: new library_1.Decimal(item.priceAtTimeOfOrder).times(item.quantity),
                    productName: product?.title || 'Product Unavailable',
                    productSlug: product?.slug,
                    productImage: product?.images?.[0] || null,
                    variantSku: item.variant?.sku,
                    customizationDetails: item.customizationDetails,
                    customizationImages: item.customizationImages,
                    sellerName: business?.name || 'Unknown Seller',
                    sellerId: business?.id
                };
            })
        };
    }
    async cancelOrder(customerUserId, orderId, dto) {
        return this.prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: { id: orderId },
                include: {
                    items: {
                        include: {
                            variant: {
                                include: {
                                    product: {
                                        select: { isCustomizable: true },
                                    },
                                },
                            },
                        },
                    },
                },
            });
            if (!order) {
                throw new common_1.NotFoundException(`Order with ID "${orderId}" not found.`);
            }
            if (order.customerUserId !== customerUserId) {
                throw new common_1.ForbiddenException('You do not have permission to cancel this order.');
            }
            const currentStatus = order.status;
            if (currentStatus === client_1.OrderStatus.shipped || currentStatus === client_1.OrderStatus.delivered) {
                throw new common_1.BadRequestException('Cannot cancel an order that has already been shipped.');
            }
            if (currentStatus === client_1.OrderStatus.cancelled) {
                throw new common_1.BadRequestException('This order has already been cancelled.');
            }
            if (currentStatus === client_1.OrderStatus.processing) {
                const hasCustomizableProduct = order.items.some(item => item.variant?.product?.isCustomizable === true);
                if (hasCustomizableProduct) {
                    throw new common_1.BadRequestException('Cannot cancel this order as it contains a customizable product that is already being processed.');
                }
            }
            const updatedOrder = await tx.order.update({
                where: { id: orderId },
                data: {
                    status: client_1.OrderStatus.cancelled,
                    cancelledAt: new Date(),
                    cancellationReason: `Customer cancellation: ${dto.reason}`,
                },
            });
            for (const item of order.items) {
                if (item.variantId) {
                    await tx.variant.update({
                        where: { id: item.variantId },
                        data: { stock: { increment: item.quantity } },
                    });
                }
            }
            if (order.paymentMethod === 'online' && order.paymentStatus === 'completed') {
                console.log(`REFUND TRIGGERED: A refund needs to be processed for order ${order.orderNumber}.`);
            }
            const businessIds = new Set();
            const itemsWithBusiness = await tx.orderItem.findMany({
                where: { orderId: order.id },
                include: { variant: { include: { product: { select: { businessId: true } } } } }
            });
            itemsWithBusiness.forEach(item => {
                if (item.variant?.product?.businessId) {
                    businessIds.add(item.variant.product.businessId);
                }
            });
            const sellers = await tx.user.findMany({
                where: { businesses: { some: { id: { in: Array.from(businessIds) } } } }
            });
            return updatedOrder;
        });
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OrdersService);
//# sourceMappingURL=order.service.js.map