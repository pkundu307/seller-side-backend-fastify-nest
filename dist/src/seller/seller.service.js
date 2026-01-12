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
exports.SellerService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const pdf_service_1 = require("./pdf.service");
let SellerService = class SellerService {
    prisma;
    pdfService;
    constructor(prisma, pdfService) {
        this.prisma = prisma;
        this.pdfService = pdfService;
    }
    async getBusinessOrders(businessId, query) {
        const { page = 1, limit = 10, status, paymentMethod, search } = query;
        const skip = (page - 1) * limit;
        const where = {
            items: {
                some: {
                    variant: {
                        product: {
                            businessId: businessId,
                        },
                    },
                },
            },
            status: status ? { equals: status } : undefined,
            paymentMethod: paymentMethod ? { equals: paymentMethod } : undefined,
            orderNumber: search ? { contains: search, mode: 'insensitive' } : undefined,
        };
        const orders = await this.prisma.order.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                orderNumber: true,
                createdAt: true,
                totalAmount: true,
                status: true,
                paymentMethod: true,
                customerUser: {
                    select: { name: true },
                },
                _count: {
                    select: { items: true },
                },
            },
        });
        const totalOrders = this.prisma.order.count({ where });
        const cashOnDeliveryOrders = this.prisma.order.count({ where: { ...where, paymentMethod: client_1.PaymentMethod.cash_on_delivery } });
        const onlineOrders = this.prisma.order.count({ where: { ...where, paymentMethod: client_1.PaymentMethod.online } });
        const deliveredOrders = this.prisma.order.count({ where: { ...where, status: client_1.OrderStatus.delivered } });
        const pendingOrders = this.prisma.order.count({ where: { ...where, status: client_1.OrderStatus.pending } });
        const [total, cod, online, delivered, pending] = await Promise.all([
            totalOrders,
            cashOnDeliveryOrders,
            onlineOrders,
            deliveredOrders,
            pendingOrders,
        ]);
        return {
            orders,
            stats: {
                totalOrders: total,
                cashOnDeliveryOrders: cod,
                onlineOrders: online,
                deliveredOrders,
                pendingOrders,
            },
            pagination: {
                total,
                page,
                limit,
                lastPage: Math.ceil(total / limit),
            },
        };
    }
    async getBusinessOrderById(businessId, orderId) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    where: {
                        variant: {
                            product: {
                                businessId: businessId,
                            },
                        },
                    },
                    include: {
                        variant: {
                            select: {
                                sku: true,
                                images: true,
                                attributeValues: {
                                    include: {
                                        attribute: { select: { name: true } },
                                        attributeOption: { select: { value: true } },
                                    },
                                },
                            },
                        },
                    },
                },
                customerUser: {
                    select: {
                        name: true,
                    },
                },
            },
        });
        if (!order) {
            throw new common_1.NotFoundException(`Order with ID "${orderId}" not found.`);
        }
        if (order.items.length === 0) {
            throw new common_1.ForbiddenException(`You do not have permission to view this order as it contains no items from your business.`);
        }
        const { customerUser, ...restOfOrder } = order;
        return {
            ...restOfOrder,
            customer: {
                name: customerUser.name,
                shippingAddress: order.selectedAddress,
            },
        };
    }
    async updateOrderStatus(businessId, orderId, dto) {
        return this.prisma.$transaction(async (tx) => {
            const orderWithRelations = await tx.order.findFirst({
                where: {
                    id: orderId,
                    items: {
                        some: { variant: { product: { businessId: businessId } } },
                    },
                },
                include: {
                    items: {
                        where: { variant: { product: { businessId: businessId } } },
                        include: { variant: { select: { sku: true, hsnCode: true } } },
                    },
                    customerUser: { select: { name: true } },
                },
            });
            if (!orderWithRelations) {
                throw new common_1.NotFoundException(`Order with ID "${orderId}" not found or it does not belong to your business.`);
            }
            const allowedTransitions = {
                pending: [client_1.OrderStatus.processing, client_1.OrderStatus.cancelled],
                processing: [client_1.OrderStatus.shipped, client_1.OrderStatus.cancelled],
                shipped: [client_1.OrderStatus.delivered],
                delivered: [],
                cancelled: [],
            };
            const currentStatus = orderWithRelations.status;
            const nextStatus = dto.status;
            if (currentStatus !== nextStatus) {
                if (nextStatus !== undefined) {
                    const possibleNextStatuses = allowedTransitions[currentStatus];
                    if (!possibleNextStatuses || !possibleNextStatuses.includes(nextStatus)) {
                        throw new common_1.BadRequestException(`Invalid status transition from "${currentStatus}" to "${nextStatus}".`);
                    }
                }
            }
            const dataToUpdate = {
                status: dto.status,
                trackingNumber: dto.trackingNumber,
                cancellationReason: dto.cancellationReason,
                estimatedDeliveryDate: dto.estimatedDeliveryDate,
            };
            if (dto.status) {
                switch (dto.status) {
                    case client_1.OrderStatus.processing:
                        dataToUpdate.confirmedAt = new Date();
                        break;
                    case client_1.OrderStatus.shipped:
                        dataToUpdate.shippedAt = new Date();
                        break;
                    case client_1.OrderStatus.delivered:
                        dataToUpdate.deliveredAt = new Date();
                        break;
                    case client_1.OrderStatus.cancelled:
                        dataToUpdate.cancelledAt = new Date();
                        break;
                }
            }
            const updatedOrder = await tx.order.update({
                where: { id: orderId },
                data: dataToUpdate,
            });
            if (updatedOrder.status === client_1.OrderStatus.delivered && currentStatus !== client_1.OrderStatus.cancelled) {
                await this._createSaleFromOrder(tx, businessId, orderWithRelations);
            }
            return updatedOrder;
        });
    }
    async _createSaleFromOrder(tx, businessId, order) {
        const business = await tx.business.findUnique({ where: { id: businessId } });
        if (!business)
            throw new common_1.InternalServerErrorException("Business not found during sale creation");
        const existingSale = await tx.sale.findFirst({ where: { notes: `From E-commerce Order #${order.orderNumber}` } });
        if (existingSale) {
            console.log(`Sale for order ${order.orderNumber} already exists. Skipping.`);
            return;
        }
        const address = order.selectedAddress;
        await tx.sale.create({
            data: {
                businessId,
                partyId: order.customerUserId,
                partyName: order.customerUser.name,
                businessName: business.name,
                billingAddress: `${address.street}, ${address.city}, ${address.state} - ${address.postalCode}`,
                shippingAddress: `${address.street}, ${address.city}, ${address.state} - ${address.postalCode}`,
                phoneNo: address.alternativePhoneNumber || '',
                placeOfSupply: address.state,
                invoiceDate: new Date(),
                invoiceNo: Math.floor(1000 + Math.random() * 9000),
                invoicePrefix: 'INV',
                totalTaxableAmount: order.totalAmount.minus(order.taxAmount),
                totalTaxAmount: order.taxAmount,
                totalAmount: order.totalAmount,
                discountAmount: order.discount,
                notes: `From E-commerce Order #${order.orderNumber}`,
                status: 'FINALIZED',
                isSettled: order.paymentMethod === 'online',
                balanceAmount: order.paymentMethod === 'cash_on_delivery' ? order.totalAmount : 0,
                saleItems: {
                    create: order.items.map((item) => ({
                        itemId: item.variantId,
                        itemName: `${item.variant.sku}`,
                        hsnCode: item.variant.hsnCode || '',
                        quantity: item.quantity,
                        price: item.priceAtTimeOfOrder,
                        taxableAmount: new client_1.Prisma.Decimal(item.priceAtTimeOfOrder).times(item.quantity),
                        amount: new client_1.Prisma.Decimal(item.priceAtTimeOfOrder).times(item.quantity),
                        itemDescription: '', sacCode: '', batchNo: '', manufactureDate: new Date(),
                        expiryDate: new Date(), priceType: '', unit: '', discountPercent: 0,
                        discountAmount: 0, tax: '', taxAmount: 0, cess: '', cessAmount: 0,
                        isMrpEnabled: false, isWholesaleEnabled: false, isSerialisationEnabled: false,
                        isBatchingEnabled: false, sellingPrice: 0, sellingPriceType: '',
                        purchasePrice: 0, purchasePriceType: '', mrp: 0, wholesalePrice: 0,
                        wholesalePriceType: '', wholesaleQuantity: 0, itemCode: ''
                    })),
                },
                saleType: '', paymentTerm: 0, partyType: '', taxId: '', panNo: '',
                isDiscountAfterTaxEnabled: false, discountPercent: 0, isAutoRoundoffEnabled: false,
                roundoffType: '', roundoffAmount: 0, termCondition: '', isScanItemEnabled: false,
                isConverted: false, party: '', isDueDateEnabled: false, dueDate: new Date()
            },
        });
    }
    async createPosSale(businessId, dto) {
        const { customerName = 'Walk-in Customer', customerPhone = '', items } = dto;
        const variantIds = items.map(item => item.variantId);
        const variants = await this.prisma.variant.findMany({
            where: {
                id: { in: variantIds },
                product: { businessId: businessId },
            },
            select: { id: true, price: true, stock: true, sku: true, hsnCode: true }
        });
        if (variants.length !== variantIds.length) {
            throw new common_1.BadRequestException("One or more variants are invalid or do not belong to your business.");
        }
        let totalAmount = new client_1.Prisma.Decimal(0);
        const saleItemsToCreate = items.map(item => {
            const variant = variants.find(v => v.id === item.variantId);
            if (!variant)
                throw new common_1.InternalServerErrorException();
            if (variant.stock < item.quantity) {
                throw new common_1.BadRequestException(`Insufficient stock for SKU ${variant.sku}. Available: ${variant.stock}, Requested: ${item.quantity}`);
            }
            const itemTotal = variant.price.times(item.quantity);
            totalAmount = totalAmount.plus(itemTotal);
            return {
                itemId: variant.id,
                itemName: variant.sku,
                hsnCode: variant.hsnCode || '',
                quantity: item.quantity,
                price: variant.price,
                taxableAmount: itemTotal,
                amount: itemTotal,
                itemDescription: '', sacCode: '', batchNo: '', manufactureDate: new Date(),
                expiryDate: new Date(), priceType: '', unit: '', discountPercent: 0,
                discountAmount: 0, tax: '', taxAmount: 0, cess: '', cessAmount: 0,
                isMrpEnabled: false, isWholesaleEnabled: false, isSerialisationEnabled: false,
                isBatchingEnabled: false, sellingPrice: 0, sellingPriceType: '',
                purchasePrice: 0, purchasePriceType: '', mrp: 0, wholesalePrice: 0,
                wholesalePriceType: '', wholesaleQuantity: 0, itemCode: ''
            };
        });
        return this.prisma.$transaction(async (tx) => {
            const newSale = await tx.sale.create({
                data: {
                    businessId: businessId,
                    partyName: customerName,
                    phoneNo: customerPhone,
                    invoiceDate: new Date(),
                    invoiceNo: Math.floor(1000 + Math.random() * 9000),
                    invoicePrefix: 'POS',
                    totalAmount: totalAmount,
                    totalTaxableAmount: totalAmount,
                    status: 'FINALIZED',
                    isSettled: true,
                    balanceAmount: 0,
                    notes: 'In-store Point-of-Sale transaction.',
                    saleItems: { create: saleItemsToCreate },
                    partyId: '', saleType: '', paymentTerm: 0, partyType: '', businessName: '',
                    billingAddress: '', shippingAddress: '', placeOfSupply: '', taxId: '', panNo: '',
                    isDiscountAfterTaxEnabled: false, discountPercent: 0, discountAmount: 0, totalTaxAmount: 0,
                    isAutoRoundoffEnabled: false, roundoffType: '', roundoffAmount: 0, termCondition: '',
                    isScanItemEnabled: false, isConverted: false, party: '', isDueDateEnabled: false, dueDate: new Date()
                },
            });
            for (const item of items) {
                await tx.variant.update({
                    where: { id: item.variantId },
                    data: { stock: { decrement: item.quantity } },
                });
            }
            return newSale;
        });
    }
    async generateShippingLabelPdf(businessId, orderId, design = 'a4') {
        console.log(`[PDF] Starting generation for Order ID: ${orderId}, Design: ${design}`);
        console.log('[PDF] Fetching full order details from database...');
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                customerUser: { select: { name: true } },
                items: {
                    include: {
                        variant: {
                            select: {
                                sku: true,
                                hsnCode: true,
                                product: {
                                    include: {
                                        category: { select: { gstRate: true } },
                                        business: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!order) {
            console.error(`[PDF] ERROR: Order with ID "${orderId}" not found.`);
            throw new common_1.NotFoundException(`Order with ID "${orderId}" not found.`);
        }
        const belongsToSeller = order.items.some(item => item.variant?.product?.businessId === businessId);
        if (!belongsToSeller) {
            console.error(`[PDF] FORBIDDEN: User tried to access order ${orderId} not belonging to business ${businessId}.`);
            throw new common_1.ForbiddenException(`You do not have permission to generate a label for this order.`);
        }
        console.log('[PDF] ✅ Ownership verified.');
        try {
            console.log(`[PDF] Calling PdfService to build '${design}' design...`);
            let pdfBuffer;
            if (design === 'pos') {
                pdfBuffer = await this.pdfService.generatePosReceipt(order);
            }
            else {
                pdfBuffer = await this.pdfService.generateA4Invoice(order);
            }
            console.log(`[PDF] ✅ PDF buffer created successfully. Size: ${pdfBuffer.length} bytes.`);
            return pdfBuffer;
        }
        catch (error) {
            console.error('[PDF] ❌ An error occurred during PDF generation:', error);
            throw new common_1.InternalServerErrorException('Failed to generate PDF document.');
        }
    }
    async getBusinessSales(businessId, query) {
        const { page = 1, limit = 15, search } = query;
        const skip = (page - 1) * limit;
        const where = {
            businessId: businessId,
            ...(search && {
                OR: [
                    { partyName: { contains: search, mode: 'insensitive' } },
                    { invoicePrefix: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };
        const [sales, totalSales] = await this.prisma.$transaction([
            this.prisma.sale.findMany({
                where,
                skip,
                take: limit,
                orderBy: { invoiceDate: 'desc' },
                select: {
                    id: true,
                    invoicePrefix: true,
                    invoiceNo: true,
                    invoiceDate: true,
                    partyName: true,
                    totalAmount: true,
                    status: true,
                    isSettled: true,
                    balanceAmount: true,
                },
            }),
            this.prisma.sale.count({ where }),
        ]);
        return {
            sales: sales.map(sale => ({
                ...sale,
                invoiceNumber: `${sale.invoicePrefix}-${sale.invoiceNo}`,
            })),
            pagination: {
                total: totalSales,
                page,
                limit,
                lastPage: Math.ceil(totalSales / limit),
            },
        };
    }
    async getBusinessSaleById(businessId, saleId) {
        const sale = await this.prisma.sale.findUnique({
            where: { id: saleId },
            include: {
                saleItems: true,
                saleTaxes: true,
                saleAdditionalCharges: true,
            },
        });
        if (!sale || sale.businessId !== businessId) {
            throw new common_1.NotFoundException(`Sale with ID "${saleId}" not found or does not belong to your business.`);
        }
        return sale;
    }
};
exports.SellerService = SellerService;
exports.SellerService = SellerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        pdf_service_1.PdfService])
], SellerService);
//# sourceMappingURL=seller.service.js.map