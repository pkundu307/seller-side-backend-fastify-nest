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
exports.PdfService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const PDFDocument = require("pdfkit");
let PdfService = class PdfService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generateA4Invoice(order) {
        const business = order.items[0]?.variant.product.business;
        if (!business)
            throw new common_1.InternalServerErrorException('Business data not found for order items.');
        const shippingAddress = order.selectedAddress;
        return new Promise((resolve) => {
            const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            this._drawA4Header(doc, business, order);
            this._drawCustomerInfo(doc, order.customerUser, shippingAddress, business);
            this._drawInvoiceTable(doc, order);
            this._drawA4Footer(doc);
            const range = doc.bufferedPageRange();
            for (let i = range.start; i < range.start + range.count; i++) {
                doc.switchToPage(i);
                this._drawA4Header(doc, business, order);
                this._drawA4Footer(doc);
            }
            doc.end();
        });
    }
    async generatePosReceipt(order) {
        const business = order.items[0]?.variant.product.business;
        if (!business)
            throw new common_1.InternalServerErrorException('Business data not found for order items.');
        return new Promise((resolve) => {
            const doc = new PDFDocument({ size: [226, 800], margin: 10 });
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.font('Courier-Bold').fontSize(10).text(business.name.toUpperCase(), { align: 'center' });
            doc.font('Courier').fontSize(8);
            if (business.address)
                doc.text(business.address, { align: 'center', width: 206 });
            doc.text(`GSTIN: ${business.gstNumber || 'N/A'}`, { align: 'center' });
            doc.text(`Phone: ${business.phone}`, { align: 'center' });
            if (business.websiteUrl)
                doc.text(business.websiteUrl, { align: 'center', link: business.websiteUrl, underline: true });
            doc.moveDown();
            doc.text(`Order #: ${order.orderNumber}`).text(`Date: ${new Date(order.createdAt).toLocaleString()}`);
            doc.text('----------------------------------');
            doc.font('Courier-Bold');
            doc.text('Item(s)           Qty   Rate    Amt');
            doc.font('Courier');
            doc.text('----------------------------------');
            let subtotal = 0;
            order.items.forEach(item => {
                const itemTotal = item.priceAtTimeOfOrder.toNumber() * item.quantity;
                subtotal += itemTotal;
                const name = item.variant.product.title;
                doc.text(name, { width: 120 });
                const qty = `x ${item.quantity}`;
                const rate = `@ ${item.priceAtTimeOfOrder.toFixed(2)}`;
                const total = itemTotal.toFixed(2);
                doc.text(`${qty} ${rate}`, { align: 'left' });
                doc.text(total, { align: 'right' });
                doc.moveDown(0.5);
            });
            doc.text('----------------------------------');
            doc.fontSize(9);
            this._drawPosTotalLine(doc, 'Sub Total:', subtotal.toFixed(2));
            if (order.discount.toNumber() > 0)
                this._drawPosTotalLine(doc, 'Discount:', `-${order.discount.toFixed(2)}`);
            if (order.shippingFee.toNumber() > 0)
                this._drawPosTotalLine(doc, 'Shipping:', order.shippingFee.toFixed(2));
            if (order.taxAmount.toNumber() > 0)
                this._drawPosTotalLine(doc, 'Taxes (GST):', order.taxAmount.toFixed(2));
            doc.moveDown(0.5);
            doc.font('Courier-Bold').fontSize(10);
            this._drawPosTotalLine(doc, 'TOTAL:', `Rs. ${order.totalAmount.toFixed(2)}`);
            doc.moveDown();
            doc.font('Courier').fontSize(8).text('Thank You for your purchase!', { align: 'center' });
            doc.text('Please visit us at jottosop.in', { align: 'center' });
            doc.end();
        });
    }
    _drawA4Header(doc, business, order) {
        doc.fillColor('#000000').fontSize(20).font('Helvetica-Bold').text(business.name.toUpperCase(), 50, 50);
        doc.fontSize(10).font('Helvetica');
        if (business.websiteUrl) {
            doc.fillColor('#0000FF').text(business.websiteUrl, 50, doc.y, { link: business.websiteUrl, underline: true });
        }
        doc.fillColor('#000000').fontSize(14).font('Helvetica-Bold').text('TAX INVOICE', 200, 50, { align: 'right' });
        doc.fontSize(10).font('Helvetica');
        doc.text(`Invoice #: ${order.orderNumber}`, 200, 70, { align: 'right' });
        doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 200, 85, { align: 'right' });
        doc.moveTo(50, 110).lineTo(550, 110).stroke();
    }
    _drawCustomerInfo(doc, customer, address, business) {
        doc.fontSize(10).fillColor('#444444');
        doc.text('Bill To:', 50, 130);
        doc.text('Shipped From:', 300, 130);
        doc.fontSize(11).fillColor('#000000').font('Helvetica-Bold');
        doc.text(customer.name, 50, 145);
        doc.text(business.name, 300, 145);
        doc.font('Helvetica');
        doc.text(address.street, 50, 160, { width: 250 });
        doc.text(business.address, 300, 160, { width: 250 });
        doc.text(`${address.city}, ${address.state} ${address.postalCode}`, 50, doc.y);
        doc.text(`${business.city}, ${business.state} ${business.postalCode}`, 300, doc.y - 12);
        doc.text(`GSTIN: ${business.gstNumber || 'N/A'}`, 300, doc.y);
        doc.moveTo(50, doc.y + 10).lineTo(550, doc.y + 10).stroke();
    }
    _drawInvoiceTable(doc, order) {
        let tableTop = 230;
        const tableBottom = 700;
        doc.font('Helvetica-Bold');
        this._generateTableRow(doc, tableTop, '#', 'Item Name', 'HSN', 'Qty', 'Rate', 'GST', 'Amount');
        doc.moveTo(50, tableTop + 20).lineTo(550, tableTop + 20).stroke();
        doc.font('Helvetica');
        let i = 0;
        for (const item of order.items) {
            const y = tableTop + (i + 1) * 30;
            if (y > tableBottom) {
                doc.addPage();
                tableTop = 50;
                i = 0;
                this._generateTableRow(doc, tableTop, '#', 'Item Name', 'HSN', 'Qty', 'Rate', 'GST', 'Amount');
                doc.moveTo(50, tableTop + 20).lineTo(550, tableTop + 20).stroke();
            }
            const position = tableTop + (i + 1) * 30;
            const itemTotal = item.quantity * item.priceAtTimeOfOrder.toNumber();
            const gstRate = item.variant.product.category.gstRate.toNumber();
            this._generateTableRow(doc, position, (i + 1).toString(), item.variant.product.title, item.variant.hsnCode || 'N/A', item.quantity.toString(), item.priceAtTimeOfOrder.toFixed(2), `${gstRate}%`, itemTotal.toFixed(2));
            i++;
        }
        doc.moveTo(50, doc.y + 10).lineTo(550, doc.y + 10).stroke();
        this._drawA4Totals(doc, order, doc.y + 15);
    }
    _generateTableRow(doc, y, ...cols) {
        const colWidths = [30, 220, 60, 40, 60, 50, 60];
        let x = 50;
        cols.forEach((text, i) => {
            doc.fontSize(10).text(text, x, y, { width: colWidths[i], align: i > 2 ? 'right' : 'left' });
            x += colWidths[i];
        });
    }
    _drawA4Totals(doc, order, y) {
        const subtotal = order.totalAmount.plus(order.discount).minus(order.shippingFee).minus(order.taxAmount);
        doc.fontSize(10);
        this._drawTotalLine(doc, 'Sub Total:', subtotal.toFixed(2), y);
        this._drawTotalLine(doc, 'Discount:', `-${order.discount.toFixed(2)}`, y + 15);
        this._drawTotalLine(doc, 'Shipping:', order.shippingFee.toFixed(2), y + 30);
        this._drawTotalLine(doc, 'GST:', order.taxAmount.toFixed(2), y + 45);
        doc.moveTo(380, y + 65).lineTo(550, y + 65).stroke();
        doc.font('Helvetica-Bold');
        this._drawTotalLine(doc, 'TOTAL:', `₹ ${order.totalAmount.toFixed(2)}`, y + 75);
        doc.font('Helvetica');
    }
    _drawTotalLine(doc, label, value, y) {
        doc.text(label, 400, y, { align: 'left', width: 100 });
        doc.text(value, 0, y, { align: 'right' });
    }
    _drawA4Footer(doc) {
        doc.fontSize(8).text('For any queries or support, please visit us at jottosop.in', 50, 780, { align: 'center', width: 500 });
    }
    _drawPosTotalLine(doc, label, value) {
        const labelPadded = label.padEnd(15);
        const valuePadded = value.padStart(15);
        doc.text(`${labelPadded}${valuePadded}`);
    }
};
exports.PdfService = PdfService;
exports.PdfService = PdfService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PdfService);
//# sourceMappingURL=pdf.service.js.map