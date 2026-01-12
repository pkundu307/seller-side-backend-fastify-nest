import { PaymentService } from './payment.service';
import { CreatePaymentInitiationDto } from './dto/create-payment-initiation.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { UserRequest } from '../auth/auth.types';
export declare class PaymentController {
    private readonly paymentService;
    constructor(paymentService: PaymentService);
    initiateOrder(req: UserRequest, dto: CreatePaymentInitiationDto): Promise<{
        razorpayOrder: import("razorpay/dist/types/orders").Orders.RazorpayOrder;
        priceDetails: import("./payment.service").PriceDetails;
    }>;
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
