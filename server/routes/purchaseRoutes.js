const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
    submitPaymentSlip,
    getPendingSlips,
    getSlipFile,
    approveSlip,
    rejectSlip,
    createCheckoutSession,
    handleStripeWebhook,
    getMyPurchases,
    verifyPurchase,
    getSessionStatus,
    getInvoiceData,
    downloadInvoicePDF
} = require('../controllers/purchaseController');
const { protect, instructorOnly } = require('../middleware/authMiddleware');

const slipUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }
});

// Stripe webhook (must be before JSON body parser in main app)
// Note: This route is mounted separately in index.js with raw body parser
router.post('/webhook', handleStripeWebhook);

// Protected routes
// Invoices: only the student, the course instructor or an admin
router.get('/invoice/:invoiceNumber', protect, getInvoiceData);
router.get('/invoice/:invoiceNumber/pdf', protect, downloadInvoicePDF);
router.post('/checkout', protect, createCheckoutSession);
router.post('/slip', protect, slipUpload.single('slip'), submitPaymentSlip);
router.get('/slips', protect, instructorOnly, getPendingSlips);
router.get('/:id/slip', protect, getSlipFile);
router.put('/:id/slip/approve', protect, instructorOnly, approveSlip);
router.put('/:id/slip/reject', protect, instructorOnly, rejectSlip);
router.get('/my-purchases', protect, getMyPurchases);
router.get('/verify/:courseId', protect, verifyPurchase);
router.get('/session/:sessionId', protect, getSessionStatus);

module.exports = router;
