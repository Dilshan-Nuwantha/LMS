const PDFDocument = require('pdfkit');

const CURRENCY_SYMBOLS = { INR: '₹', USD: '$' };

/**
 * Generate a professional PDF invoice and pipe it to the response stream.
 * @param {Object} purchase - Populated purchase document (user, course, instructor)
 * @param {Object} res - Express response object
 */
const generateInvoicePDF = (purchase, res) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    const currency = CURRENCY_SYMBOLS[purchase.currency] || '₹';
    const isPaid = purchase.invoiceStatus === 'paid';

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${purchase.invoiceNumber}.pdf`);
    doc.pipe(res);

    // --- Header ---
    doc.fontSize(24).font('Helvetica-Bold').text('Skill Path', 50, 50);
    doc.fontSize(10).font('Helvetica').fillColor('#666666')
        .text('Course Marketplace', 50, 80);

    // Invoice title + status badge
    doc.fontSize(28).font('Helvetica-Bold').fillColor('#1e293b')
        .text('INVOICE', 400, 50, { align: 'right' });

    doc.fontSize(11).font('Helvetica-Bold')
        .fillColor(isPaid ? '#16a34a' : '#f59e0b')
        .text(isPaid ? 'PAID' : 'CREATED', 400, 85, { align: 'right' });

    // Divider
    doc.moveTo(50, 110).lineTo(545, 110).strokeColor('#e2e8f0').stroke();

    // --- Invoice Details ---
    const detailsY = 130;
    doc.fontSize(9).font('Helvetica').fillColor('#64748b');

    doc.text('Invoice Number', 50, detailsY);
    doc.text('Date', 200, detailsY);
    doc.text('Payment ID', 350, detailsY);

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b');
    doc.text(purchase.invoiceNumber, 50, detailsY + 15);
    doc.text(formatDate(purchase.purchasedAt || purchase.createdAt), 200, detailsY + 15);
    doc.text(purchase.stripePaymentIntentId || '-', 350, detailsY + 15, { width: 195 });

    // --- Bill To ---
    const billY = 185;
    doc.fontSize(9).font('Helvetica').fillColor('#64748b')
        .text('BILL TO', 50, billY);

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e293b')
        .text(purchase.user?.name || 'Student', 50, billY + 15);
    doc.fontSize(10).font('Helvetica').fillColor('#475569')
        .text(purchase.user?.email || '', 50, billY + 30);

    // --- Instructor ---
    doc.fontSize(9).font('Helvetica').fillColor('#64748b')
        .text('INSTRUCTOR', 350, billY);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e293b')
        .text(purchase.instructor?.name || 'Instructor', 350, billY + 15);

    // --- Table Header ---
    const tableTop = 260;

    // Table header background
    doc.rect(50, tableTop, 495, 25).fill('#f1f5f9');

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#475569');
    doc.text('ITEM', 60, tableTop + 8);
    doc.text('CATEGORY', 310, tableTop + 8);
    doc.text('AMOUNT', 440, tableTop + 8, { align: 'right', width: 95 });

    // --- Table Row ---
    const rowY = tableTop + 35;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b')
        .text(purchase.course?.title || 'Course', 60, rowY, { width: 240 });

    const titleHeight = doc.heightOfString(purchase.course?.title || 'Course', { width: 240 });

    doc.fontSize(9).font('Helvetica').fillColor('#64748b')
        .text(purchase.course?.category || '-', 310, rowY);

    doc.fontSize(10).font('Helvetica').fillColor('#1e293b')
        .text(`${currency}${purchase.originalPrice || purchase.amount}`, 440, rowY, { align: 'right', width: 95 });

    // --- Totals ---
    const totalsY = rowY + Math.max(titleHeight, 15) + 30;

    // Divider before totals
    doc.moveTo(300, totalsY).lineTo(545, totalsY).strokeColor('#e2e8f0').stroke();

    const lineHeight = 22;
    let currentY = totalsY + 10;

    // Original Price
    if (purchase.discountAmount > 0) {
        doc.fontSize(10).font('Helvetica').fillColor('#64748b')
            .text('Subtotal', 300, currentY)
            .text(`${currency}${purchase.originalPrice || purchase.amount + purchase.discountAmount}`, 440, currentY, { align: 'right', width: 95 });
        currentY += lineHeight;

        // Discount
        doc.fontSize(10).font('Helvetica').fillColor('#16a34a')
            .text('Discount', 300, currentY)
            .text(`-${currency}${purchase.discountAmount}`, 440, currentY, { align: 'right', width: 95 });
        currentY += lineHeight;
    }

    // Total
    doc.moveTo(300, currentY).lineTo(545, currentY).strokeColor('#e2e8f0').stroke();
    currentY += 8;

    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1e293b')
        .text('Total', 300, currentY)
        .text(`${currency}${purchase.amount}`, 440, currentY, { align: 'right', width: 95 });

    currentY += lineHeight + 5;

    doc.fontSize(10).font('Helvetica').fillColor(isPaid ? '#16a34a' : '#f59e0b')
        .text(isPaid ? 'Payment Received' : 'Payment Pending', 300, currentY, { align: 'right', width: 235 });

    // --- Footer ---
    const footerY = 720;
    doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor('#e2e8f0').stroke();

    doc.fontSize(9).font('Helvetica').fillColor('#94a3b8')
        .text('Thank you for your purchase!', 50, footerY + 15, { align: 'center', width: 495 })
        .text('This is a computer-generated invoice and does not require a signature.', 50, footerY + 30, { align: 'center', width: 495 });

    doc.end();
};

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

module.exports = { generateInvoicePDF };
