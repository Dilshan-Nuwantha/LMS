const express = require('express');
const router = express.Router();
const {
    createCheckoutSession,
    handleStripeWebhook,
    getMyPurchases,
    verifyPurchase,
    getSessionStatus,
    getInvoiceData,
    downloadInvoicePDF
} = require('../controllers/purchaseController');
const { protect } = require('../middleware/authMiddleware');

// Stripe webhook (must be before JSON body parser in main app)
// Note: This route is mounted separately in index.js with raw body parser
router.post('/webhook', handleStripeWebhook);

// Protected routes
// Invoices: only the student, the course instructor or an admin
router.get('/invoice/:invoiceNumber', protect, getInvoiceData);
router.get('/invoice/:invoiceNumber/pdf', protect, downloadInvoicePDF);
router.post('/checkout', protect, createCheckoutSession);
router.get('/my-purchases', protect, getMyPurchases);
router.get('/verify/:courseId', protect, verifyPurchase);
router.get('/session/:sessionId', protect, getSessionStatus);

module.exports = router;
