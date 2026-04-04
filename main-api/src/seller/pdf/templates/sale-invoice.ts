// src/seller/pdf/templates/sale-invoice.ts
import * as PDFDocument from 'pdfkit';
import axios from 'axios';
import * as sharp from 'sharp';

// ─────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────
const PAGE_WIDTH    = 595;
const PAGE_HEIGHT   = 841;
const MARGIN        = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 495

const COL = {
  num:   MARGIN,
  name:  MARGIN + 24,
  qty:   MARGIN + 310,
  price: MARGIN + 370,
  total: MARGIN + 450,
};

const FOOTER_HEIGHT      = 120;
const HEADER_HEIGHT      = 130; // approx space header takes
const TABLE_HEADER_H     = 20;
const ROW_HEIGHT         = 18;
const SUMMARY_HEIGHT     = 80;  // space needed for subtotal+discount+tax+grandtotal
const SAFE_BOTTOM        = PAGE_HEIGHT - FOOTER_HEIGHT;

const MAX_ROWS_PER_PAGE  = 15;  // strict cap

// ─────────────────────────────────────────────────────────
// Image format detection
// ─────────────────────────────────────────────────────────
function detectFormat(
  buffer: Buffer,
): 'jpeg' | 'png' | 'webp' | 'avif' | 'unknown' {
  if (!buffer || buffer.length < 12) return 'unknown';

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
    return 'jpeg';

  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 &&
    buffer[2] === 0x4e && buffer[3] === 0x47
  ) return 'png';

  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 &&
    buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 &&
    buffer[10] === 0x42 && buffer[11] === 0x50
  ) return 'webp';

  if (
    buffer[4] === 0x66 && buffer[5] === 0x74 &&
    buffer[6] === 0x79 && buffer[7] === 0x70
  ) return 'avif';

  return 'unknown';
}

// ─────────────────────────────────────────────────────────
// Fetch + auto-convert image for PDFKit
// ─────────────────────────────────────────────────────────
async function fetchImage(url: string): Promise<Buffer | null> {
  try {
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 8000,
      headers: { Accept: 'image/jpeg,image/png' },
    });

    let buffer = Buffer.from(res.data);
    const format = detectFormat(buffer);

    if (format === 'unknown') {
      console.warn(
        `[PDF] Unknown format (bytes: ${buffer.slice(0, 12).toString('hex')}): ${url}`,
      );
      return null;
    }

    if (format === 'webp' || format === 'avif') {
      console.log(`[PDF] Converting ${format.toUpperCase()} → PNG: ${url}`);
      buffer = await sharp(buffer).png().toBuffer();
    }

    return buffer;
  } catch (e) {
    console.warn(`[PDF] Fetch failed: ${url}`, e);
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// Safe PDFKit image render
// ─────────────────────────────────────────────────────────
function safeImage(
  doc: InstanceType<typeof PDFDocument>,
  buf: Buffer,
  x: number,
  y: number,
  opts: object,
): void {
  try {
    doc.image(buf, x, y, opts);
  } catch (e) {
    console.warn('[PDF] Image render skipped:', e);
  }
}

// ─────────────────────────────────────────────────────────
// Draw page header — returns Y cursor after header
// ─────────────────────────────────────────────────────────
function drawHeader(
  doc: InstanceType<typeof PDFDocument>,
  sale: any,
  logoBuffer: Buffer | null,
): number {
  const textX = logoBuffer ? 120 : MARGIN;

  if (logoBuffer) {
    safeImage(doc, logoBuffer, MARGIN, MARGIN, { width: 55, height: 55 });
  }

  doc
    .fontSize(15).font('Helvetica-Bold').fillColor('#1a1a1a')
    .text(sale.business.name, textX, MARGIN, {
      width: CONTENT_WIDTH - (logoBuffer ? 70 : 0),
    });

  const nameBottom = doc.y;

  doc.fontSize(8).font('Helvetica').fillColor('#666666');
  if (sale.business.address) {
    doc.text(sale.business.address, textX, nameBottom + 2, { width: 260 });
  }
  if (sale.business.gstNumber) {
    doc.text(`GSTIN: ${sale.business.gstNumber}`, textX, doc.y + 2);
  }

  // Right-aligned invoice meta
  const metaX = PAGE_WIDTH - MARGIN - 180;
  doc.fontSize(8).fillColor('#333333')
     .text('SALE INVOICE', metaX, MARGIN, { width: 180, align: 'right' });
  doc.font('Helvetica-Bold').text(
    `Invoice #: ${sale.invoiceNumber || sale.id?.slice(0, 8).toUpperCase()}`,
    metaX, MARGIN + 14, { width: 180, align: 'right' },
  );
  doc.font('Helvetica').text(
    `Date: ${new Date(sale.createdAt).toLocaleDateString('en-IN')}`,
    metaX, MARGIN + 26, { width: 180, align: 'right' },
  );

  const headerBottom = Math.max(
    doc.y,
    logoBuffer ? MARGIN + 65 : MARGIN + 50,
  );

  doc
    .moveTo(MARGIN, headerBottom + 6)
    .lineTo(PAGE_WIDTH - MARGIN, headerBottom + 6)
    .lineWidth(0.5).strokeColor('#cccccc').stroke();

  return headerBottom + 14;
}

// ─────────────────────────────────────────────────────────
// Draw table column headers — returns Y after row
// ─────────────────────────────────────────────────────────
function drawTableHeader(
  doc: InstanceType<typeof PDFDocument>,
  y: number,
): number {
  doc.rect(MARGIN, y, CONTENT_WIDTH, TABLE_HEADER_H).fill('#eeeeee');

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#333333');
  doc.text('#',            COL.num,   y + 6, { width: 20 });
  doc.text('Product Name', COL.name,  y + 6, { width: 275 });
  doc.text('Qty',          COL.qty,   y + 6, { width: 45,  align: 'center' });
  doc.text('Unit Price',   COL.price, y + 6, { width: 60,  align: 'right' });
  doc.text('Amount',       COL.total, y + 6, { width: 45,  align: 'right' });

  return y + TABLE_HEADER_H;
}

// ─────────────────────────────────────────────────────────
// Draw a single item row
// ─────────────────────────────────────────────────────────
function drawRow(
  doc: InstanceType<typeof PDFDocument>,
  item: any,
  idx: number,
  rowIndex: number,
  y: number,
): void {
  const amount = Number(
    item.amount ?? Number(item.price) * Number(item.quantity),
  );

  // Alternating background
  if (rowIndex % 2 === 0) {
    doc.rect(MARGIN, y, CONTENT_WIDTH, ROW_HEIGHT).fill('#f9f9f9');
  }

  // ✅ Show product name — item.productName preferred, fallback to item.itemName
  const productLabel =
    item.productName?.trim() ||
    item.itemName?.trim() ||
    '—';

  doc.fontSize(7.5).font('Helvetica').fillColor('#222222');
  doc.text((idx + 1).toString(),         COL.num,   y + 5, { width: 20 });
  doc.text(productLabel,                  COL.name,  y + 5, { width: 275, ellipsis: true });
  doc.text(String(item.quantity),         COL.qty,   y + 5, { width: 45,  align: 'center' });
  doc.text(Number(item.price).toFixed(2), COL.price, y + 5, { width: 60,  align: 'right' });
  doc.text(amount.toFixed(2),             COL.total, y + 5, { width: 45,  align: 'right' });

  // Row bottom border
  doc
    .moveTo(MARGIN, y + ROW_HEIGHT)
    .lineTo(PAGE_WIDTH - MARGIN, y + ROW_HEIGHT)
    .lineWidth(0.2).strokeColor('#e0e0e0').stroke();
}

// ─────────────────────────────────────────────────────────
// Draw summary block (subtotal, discount, tax, grand total)
// Returns Y after summary
// ─────────────────────────────────────────────────────────
function drawSummary(
  doc: InstanceType<typeof PDFDocument>,
  sale: any,
  subtotal: number,
  y: number,
): number {
  const summaryX = COL.price - 40;
  const summaryW = 180;

  y += 10;

  // Top border
  doc
    .moveTo(summaryX, y)
    .lineTo(PAGE_WIDTH - MARGIN, y)
    .lineWidth(0.5).strokeColor('#cccccc').stroke();

  y += 8;

  // Subtotal
  doc.fontSize(8).font('Helvetica').fillColor('#555555');
  doc.text('Subtotal:',               summaryX, y, { width: 75, align: 'right' });
  doc.text(`₹${subtotal.toFixed(2)}`, COL.total, y, { width: 45, align: 'right' });

  // Discount
  if (sale.discountAmount && Number(sale.discountAmount) > 0) {
    y += 14;
    doc.fillColor('#cc3300');
    doc.text('Discount:', summaryX, y, { width: 75, align: 'right' });
    doc.text(
      `-₹${Number(sale.discountAmount).toFixed(2)}`,
      COL.total, y, { width: 45, align: 'right' },
    );
  }

  // Tax
  if (sale.taxAmount && Number(sale.taxAmount) > 0) {
    y += 14;
    doc.fillColor('#555555');
    doc.text(
      `Tax (${sale.taxPercent || ''}%):`,
      summaryX, y, { width: 75, align: 'right' },
    );
    doc.text(
      `₹${Number(sale.taxAmount).toFixed(2)}`,
      COL.total, y, { width: 45, align: 'right' },
    );
  }

  // Grand Total banner
  y += 16;
  doc.rect(summaryX - 4, y - 3, summaryW, 20).fill('#1a1a1a');
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff');
  doc.text('Grand Total:',  summaryX, y + 2, { width: 75, align: 'right' });
  doc.text(
    `₹${Number(sale.totalAmount ?? subtotal).toFixed(2)}`,
    COL.total, y + 2, { width: 45, align: 'right' },
  );

  return y + 24;
}

// ─────────────────────────────────────────────────────────
// Draw footer at fixed bottom of current page
// ─────────────────────────────────────────────────────────
function drawFooter(
  doc: InstanceType<typeof PDFDocument>,
  sale: any,
  sigBuffer: Buffer | null,
  jLogoBuffer: Buffer | null,
  pageNum: number,
  totalPages: number,
): void {
  const footerY   = PAGE_HEIGHT - FOOTER_HEIGHT;
  const sigImageH = 36;
  const sigLabelY = footerY + 8 + sigImageH + 4;

  // Divider
  doc
    .moveTo(MARGIN, footerY)
    .lineTo(PAGE_WIDTH - MARGIN, footerY)
    .lineWidth(0.5).strokeColor('#cccccc').stroke();

  // ── Signature (left) ──────────────────────────────────
  if (sigBuffer) {
    safeImage(doc, sigBuffer, MARGIN, footerY + 8, {
      width: 90,
      height: sigImageH,
    });
  }

  doc
    .fontSize(7).font('Helvetica').fillColor('#555555')
    .text(
      'Authorized Signatory',
      MARGIN,
      sigBuffer ? sigLabelY : footerY + 14,
      { width: 130 },
    );
  doc
    .fontSize(7).font('Helvetica-Bold').fillColor('#333333')
    .text(sale.business.name, MARGIN, doc.y + 2, { width: 130 });

  // ── Branding (center) ────────────────────────────────
  const brandX = PAGE_WIDTH / 2 - 60;
  const brandY = footerY + 30;

  if (jLogoBuffer) {
    safeImage(doc, jLogoBuffer, brandX, brandY, { width: 14, height: 14 });
  }

  doc
    .fontSize(6.5).font('Helvetica').fillColor('#999999')
    .text(
      'Visit: jottosop.in',
      brandX + (jLogoBuffer ? 18 : 0), brandY + 2,
      { width: 160 },
    );
  doc.text(
    'List your products: diary.jottosop.in',
    brandX + (jLogoBuffer ? 18 : 0), doc.y + 2,
    { width: 160 },
  );

  // ── Page number (right) ───────────────────────────────
  doc
    .fontSize(7).fillColor('#aaaaaa')
    .text(
      `Page ${pageNum} of ${totalPages}`,
      PAGE_WIDTH - MARGIN - 60, footerY + 48,
      { width: 60, align: 'right' },
    );
}

// ─────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────
export const generateSaleInvoiceBuffer = async (
  sale: any,
): Promise<Buffer> => {

  // ── Fetch images in parallel ──────────────────────────
  const [logoBuffer, sigBuffer, jLogoBuffer] = await Promise.all([
    sale.business?.logoUrl
      ? fetchImage(sale.business.logoUrl)
      : Promise.resolve(null),
    sale.business?.authorizedSignatorySignatureUrl
      ? fetchImage(sale.business.authorizedSignatorySignatureUrl)
      : Promise.resolve(null),
    fetchImage(
      'https://pub-5b521def0bfc46dd9037956c478b8c67.r2.dev/site/favicon-9.png',
    ),
  ]);

  const items: any[]  = sale.saleItems ?? [];
  const itemCount     = items.length;

  // ── Calculate total pages upfront ────────────────────
  // Page 1: up to 15 rows
  // Page N: up to 15 rows + summary on last page
  // Summary always goes on last content page (or new page if no room)
  const totalPages = Math.max(1, Math.ceil(itemCount / MAX_ROWS_PER_PAGE));

  // ── Init PDF doc ──────────────────────────────────────
  const doc = new PDFDocument({
    margin: MARGIN,
    size: 'A4',
    autoFirstPage: true,
  });
  const buffers: Buffer[] = [];
  doc.on('data', (b) => buffers.push(b));

  let currentPage = 1;
  let subtotal    = 0;

  // Pre-compute subtotal
  items.forEach((item) => {
    subtotal += Number(item.amount ?? Number(item.price) * Number(item.quantity));
  });

  // ── Chunk items into pages of MAX_ROWS_PER_PAGE ───────
  const pages: any[][] = [];
  for (let i = 0; i < itemCount; i += MAX_ROWS_PER_PAGE) {
    pages.push(items.slice(i, i + MAX_ROWS_PER_PAGE));
  }
  if (pages.length === 0) pages.push([]); // at least one page even if no items

  // ── Render each page ──────────────────────────────────
  pages.forEach((pageItems, pageIdx) => {
    const isLastPage  = pageIdx === pages.length - 1;
    const globalStart = pageIdx * MAX_ROWS_PER_PAGE; // global item index offset

    // New page (first page is auto-created by PDFKit)
    if (pageIdx > 0) {
      doc.addPage();
      currentPage++;
    }

    // Header
    let y = drawHeader(doc, sale, logoBuffer);

    // Bill To — only on first page
    if (pageIdx === 0 && (sale.customerName || sale.customerPhone)) {
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#333333')
         .text('Bill To:', MARGIN, y);
      doc.font('Helvetica').fillColor('#555555');
      if (sale.customerName)  doc.text(sale.customerName,  MARGIN, doc.y + 2);
      if (sale.customerPhone) doc.text(sale.customerPhone, MARGIN, doc.y + 2);
      y = doc.y + 10;
    } else {
      y += 4;
    }

    // Continuation label on non-first pages
    if (pageIdx > 0) {
      doc.fontSize(7).font('Helvetica').fillColor('#999999')
         .text('(Continued)', MARGIN, y);
      y = doc.y + 4;
    }

    // Table header
    y = drawTableHeader(doc, y);

    // Rows
    pageItems.forEach((item, rowIdx) => {
      drawRow(doc, item, globalStart + rowIdx, rowIdx, y);
      y += ROW_HEIGHT;
    });

    // Summary — only on last page, after all rows
    if (isLastPage) {
      drawSummary(doc, sale, subtotal, y);
    }

    // Footer on every page
    drawFooter(doc, sale, sigBuffer, jLogoBuffer, currentPage, totalPages);
  });

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end',   () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);
  });
};