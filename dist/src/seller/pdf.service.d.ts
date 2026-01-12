import { PrismaService } from '../prisma/prisma.service';
import { Business, Order } from '@prisma/client';
type FullOrderDetails = Order & {
    customerUser: {
        name: string;
    };
    items: Array<{
        quantity: number;
        priceAtTimeOfOrder: import('@prisma/client/runtime/library').Decimal;
        variant: {
            sku: string;
            hsnCode: string | null;
            product: {
                title: string;
                business: Business;
                category: {
                    gstRate: import('@prisma/client/runtime/library').Decimal;
                };
            };
        };
    }>;
};
export declare class PdfService {
    private prisma;
    constructor(prisma: PrismaService);
    generateA4Invoice(order: FullOrderDetails): Promise<Buffer>;
    generatePosReceipt(order: FullOrderDetails): Promise<Buffer>;
    private _drawA4Header;
    private _drawCustomerInfo;
    private _drawInvoiceTable;
    private _generateTableRow;
    private _drawA4Totals;
    private _drawTotalLine;
    private _drawA4Footer;
    private _drawPosTotalLine;
}
export {};
