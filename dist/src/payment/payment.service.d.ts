import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Razorpay from 'razorpay';
import { CreatePaymentInitiationDto } from './dto/create-payment-initiation.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { DiscountType } from '@prisma/client';
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
export declare class PaymentService {
    private prisma;
    private configService;
    private razorpay;
    constructor(prisma: PrismaService, configService: ConfigService, razorpay: Razorpay);
    initiateOrder(customerUserId: string, dto: CreatePaymentInitiationDto): Promise<{
        razorpayOrder: import("razorpay/dist/types/orders").Orders.RazorpayOrder;
        priceDetails: PriceDetails;
    }>;
    private calculateOrderTotal;
    verifyPayment(dto: VerifyPaymentDto): Promise<{
        success: boolean;
        message: string;
        order: {
            id: string;
            orderNumber: string;
            createdAt: Date;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            selectedAddress: import("@prisma/client/runtime/library").JsonValue;
            items: {
                productName: string;
                imageUrl: string | null;
                quantity: number;
                price: import("@prisma/client/runtime/library").Decimal;
            }[];
        };
    }>;
}
