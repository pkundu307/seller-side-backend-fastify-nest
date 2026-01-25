import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Sale, SaleItem, SaleAdditionalCharge } from '@prisma/client';

@Injectable()
export class PdfService {
  async generateInvoice(sale: any): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (buffer) => buffers.push(buffer));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // --- 1. HEADER ---
      doc
        .fontSize(20)
        .text(sale.businessName || 'Business Name', 50, 50)
        .fontSize(10)
        .text('TAX INVOICE', 50, 50, { align: 'right' })
        .moveDown();

      // Seller Details
      doc.text('Sold By:', 50, 90)
         .font('Helvetica-Bold').text(sale.businessName, 50, 105)
         .font('Helvetica').text(sale.shippingAddress || '', 50, 120) // Using shipping address as business address placeholder
         .text(`Phone: ${sale.business?.phone || ''}`, 50, 135);

      // Invoice Details (Right Side)
      const rightColX = 400;
      doc.text(`Invoice No: ${sale.invoicePrefix}-${sale.invoiceNo}`, rightColX, 90)
         .text(`Date: ${new Date(sale.invoiceDate).toLocaleDateString()}`, rightColX, 105)
         .text(`Payment Mode: ${sale.saleType}`, rightColX, 120);

      // Buyer Details
      doc.text('Bill To:', 50, 160)
         .font('Helvetica-Bold').text(sale.partyName, 50, 175)
         .font('Helvetica').text(`Phone: ${sale.phoneNo}`, 50, 190);
      
      if(sale.billingAddress) doc.text(sale.billingAddress, 50, 205);
      if(sale.taxId) doc.text(`GSTIN: ${sale.taxId}`, 50, 220);

      // --- 2. TABLE HEADER ---
      const tableTop = 250;
      const itemX = 50;
      const qtyX = 300;
      const priceX = 370;
      const totalX = 470;

      doc.font('Helvetica-Bold');
      doc.text('Item', itemX, tableTop);
      doc.text('Qty', qtyX, tableTop);
      doc.text('Price', priceX, tableTop);
      doc.text('Total', totalX, tableTop);
      
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      // --- 3. ITEMS ---
      let y = tableTop + 30;
      doc.font('Helvetica');

      sale.saleItems.forEach((item: SaleItem) => {
        doc.text(item.itemName, itemX, y, { width: 240 });
        doc.text(item.quantity.toString(), qtyX, y);
        doc.text(Number(item.price).toFixed(2), priceX, y);
        doc.text(Number(item.amount).toFixed(2), totalX, y);
        y += 20;
      });

      doc.moveTo(50, y).lineTo(550, y).stroke();
      y += 10;

      // --- 4. ADDITIONAL CHARGES ---
      if (sale.saleAdditionalCharges.length > 0) {
        sale.saleAdditionalCharges.forEach((charge: SaleAdditionalCharge) => {
          doc.text(charge.name, 300, y, { align: 'right', width: 160 });
          doc.text(Number(charge.amount).toFixed(2), totalX, y);
          y += 15;
        });
      }

      // --- 5. TOTALS ---
      y += 10;
      doc.font('Helvetica-Bold');
      doc.text('Grand Total:', 370, y);
      doc.text(Number(sale.totalAmount).toFixed(2), totalX, y);
      
      y += 20;
      if (Number(sale.balanceAmount) > 0) {
        doc.fillColor('red').text(`Balance Due: ${Number(sale.balanceAmount).toFixed(2)}`, 370, y);
      } else {
        doc.fillColor('green').text('PAID IN FULL', 370, y);
      }
      doc.fillColor('black');

      // --- 6. FOOTER ---
      doc.fontSize(8).text('Thank you for your business!', 50, 700, { align: 'center' });

      doc.end();
    });
  }
}