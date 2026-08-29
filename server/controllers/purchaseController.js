const asyncHandler = require('express-async-handler');
const stripe = require('../config/stripe');
const Course = require('../models/Course');
const Purchase = require('../models/Purchase');
const Progress = require('../models/Progress');
const Coupon = require('../models/Coupon');
const { generateInvoicePDF } = require('../services/invoiceService');

const requireStripe = () => {
    if (!stripe) {
        const error = new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in server/.env.');
        error.statusCode = 503;
        throw error;
    }

    return stripe;
};

// @desc    Create Stripe checkout session
// @route   POST /api/purchase/checkout
// @access  Private
const createCheckoutSession = asyncHandler(async (req, res) => {
    const { courseId, couponCode } = req.body;

    // Find the course
    const course = await Course.findOne({
        _id: courseId,
        isMarketplace: true,
        status: 'Published'
    });

    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    // Check if user already purchased this course
    const existingPurchase = await Purchase.findOne({
        user: req.user.id,
        course: courseId,
        status: 'completed'
    });

    if (existingPurchase) {
        res.status(400);
        throw new Error('You have already purchased this course');
    }

    // Check if user is the course owner
    if (course.user.toString() === req.user.id) {
        res.status(400);
        throw new Error('You cannot purchase your own course');
    }

    // Remove any previous pending/failed purchase to avoid duplicate key error
    await Purchase.deleteOne({
        user: req.user.id,
        course: courseId,
        status: { $in: ['pending', 'failed'] }
    });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    let finalPrice = course.price;
    let discountAmount = 0;
    let couponApplied = null;

    // Apply coupon if provided
    if (couponCode) {
        const coupon = await Coupon.findOne({
            code: couponCode.toUpperCase(),
            course: courseId
        });

        if (coupon) {
            const validity = coupon.isValid();
            if (validity.valid) {
                discountAmount = coupon.calculateDiscount(course.price);
                finalPrice = course.price - discountAmount;
                couponApplied = coupon._id;
            }
        }
    }

    // Ensure price is at least 1 (Stripe minimum)
    finalPrice = Math.max(finalPrice, 1);

    // Create Stripe checkout session
    const stripeClient = requireStripe();

    const session = await stripeClient.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
            {
                price_data: {
                    currency: course.currency.toLowerCase(),
                    product_data: {
                        name: course.title,
                        description: course.description.substring(0, 500),
                        images: course.thumbnail ? [course.thumbnail] : []
                    },
                    unit_amount: Math.round(finalPrice * 100) // Stripe uses cents
                },
                quantity: 1
            }
        ],
        mode: 'payment',
        billing_address_collection: 'required',
        success_url: `${clientUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${clientUrl}/marketplace/course/${courseId}`,
        customer_email: req.user.email,
        metadata: {
            courseId: courseId,
            userId: req.user.id,
            instructorId: course.user.toString(),
            couponId: couponApplied ? couponApplied.toString() : '',
            discountAmount: discountAmount.toString()
        }
    });

    // Generate invoice number at checkout initiation
    const invoiceNumber = await Purchase.generateInvoiceNumber();

    // Create pending purchase record with invoice
    await Purchase.create({
        user: req.user.id,
        course: courseId,
        instructor: course.user,
        amount: finalPrice,
        originalPrice: course.price,
        currency: course.currency,
        stripeSessionId: session.id,
        status: 'pending',
        couponApplied: couponApplied,
        discountAmount: discountAmount,
        invoiceNumber: invoiceNumber,
        invoiceStatus: 'created'
    });

    res.status(200).json({
        sessionId: session.id,
        url: session.url
    });
});

// @desc    Handle Stripe webhook
// @route   POST /api/purchase/webhook
// @access  Public (Stripe)
const handleStripeWebhook = asyncHandler(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = requireStripe().webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            await handleSuccessfulPayment(session);
            break;
        case 'checkout.session.expired':
            const expiredSession = event.data.object;
            await handleExpiredSession(expiredSession);
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.status(200).json({ received: true });
});

// Helper function to handle successful payment
const handleSuccessfulPayment = async (session) => {
    const { courseId, userId, couponId } = session.metadata;

    // Update purchase status and mark invoice as paid
    const purchase = await Purchase.findOneAndUpdate(
        { stripeSessionId: session.id },
        {
            status: 'completed',
            stripePaymentIntentId: session.payment_intent,
            purchasedAt: new Date(),
            invoiceStatus: 'paid'
        },
        { new: true }
    );

    if (!purchase) {
        console.error('Purchase not found for session:', session.id);
        return;
    }

    // Increment coupon usage
    if (couponId) {
        await Coupon.findByIdAndUpdate(couponId, {
            $inc: { usedCount: 1 }
        });
    }

    // Increment course enrollment count
    await Course.findByIdAndUpdate(courseId, {
        $inc: { enrollmentCount: 1 }
    });

    // Create progress record for the student
    const existingProgress = await Progress.findOne({
        student: userId,
        course: courseId
    });

    if (!existingProgress) {
        await Progress.create({
            student: userId,
            course: courseId,
            completedLectures: []
        });
    }

    console.log(`Payment successful for course ${courseId} by user ${userId}`);
};

// Helper function to handle expired session
const handleExpiredSession = async (session) => {
    await Purchase.findOneAndUpdate(
        { stripeSessionId: session.id },
        { status: 'failed' }
    );
};

// @desc    Get user's purchased courses
// @route   GET /api/purchase/my-purchases
// @access  Private
const getMyPurchases = asyncHandler(async (req, res) => {
    const purchases = await Purchase.find({
        user: req.user.id,
        status: 'completed'
    })
        .populate({
            path: 'course',
            select: 'title description thumbnail category level rating enrollmentCount sections'
        })
        .populate('instructor', 'name profileImage')
        .sort({ purchasedAt: -1 });

    res.status(200).json(purchases);
});

// @desc    Verify if user has purchased a course
// @route   GET /api/purchase/verify/:courseId
// @access  Private
const verifyPurchase = asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    // Check if user is the course owner
    if (course.user.toString() === req.user.id) {
        return res.status(200).json({
            hasPurchased: true,
            isOwner: true
        });
    }

    // Check if user is admin
    if (req.user.role === 'admin') {
        return res.status(200).json({
            hasPurchased: true,
            isAdmin: true
        });
    }

    // Check for completed purchase
    const purchase = await Purchase.findOne({
        user: req.user.id,
        course: courseId,
        status: 'completed'
    });

    res.status(200).json({
        hasPurchased: !!purchase,
        purchaseDate: purchase?.purchasedAt
    });
});

// @desc    Get checkout session status
// @route   GET /api/purchase/session/:sessionId
// @access  Private
const getSessionStatus = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;

    let purchase = await Purchase.findOne({
        stripeSessionId: sessionId,
        user: req.user.id
    }).populate('course', 'title');

    if (!purchase) {
        res.status(404);
        throw new Error('Session not found');
    }

    // If still pending, verify directly with Stripe (handles cases where webhook hasn't fired)
    if (purchase.status === 'pending') {
        try {
            const session = await requireStripe().checkout.sessions.retrieve(sessionId);
            if (session.payment_status === 'paid') {
                await handleSuccessfulPayment(session);
                purchase = await Purchase.findOne({
                    stripeSessionId: sessionId,
                    user: req.user.id
                }).populate('course', 'title');
            }
        } catch (err) {
            console.error('Stripe session verification failed:', err.message);
        }
    }

    res.status(200).json({
        status: purchase.status,
        course: purchase.course
    });
});

// @desc    Get invoice data (shareable - public by invoice number)
// @route   GET /api/purchase/invoice/:invoiceNumber
// @access  Public
const getInvoiceData = asyncHandler(async (req, res) => {
    const { invoiceNumber } = req.params;

    const purchase = await Purchase.findOne({ invoiceNumber })
        .populate('user', 'name email')
        .populate('course', 'title description category level')
        .populate('instructor', 'name');

    if (!purchase) {
        res.status(404);
        throw new Error('Invoice not found');
    }

    res.status(200).json({
        invoiceNumber: purchase.invoiceNumber,
        invoiceStatus: purchase.invoiceStatus,
        date: purchase.purchasedAt || purchase.createdAt,
        student: {
            name: purchase.user?.name,
            email: purchase.user?.email
        },
        course: {
            title: purchase.course?.title,
            category: purchase.course?.category,
            level: purchase.course?.level
        },
        instructor: {
            name: purchase.instructor?.name
        },
        amount: purchase.amount,
        originalPrice: purchase.originalPrice,
        discountAmount: purchase.discountAmount,
        currency: purchase.currency,
        paymentId: purchase.stripePaymentIntentId
    });
});

// @desc    Download invoice as PDF
// @route   GET /api/purchase/invoice/:invoiceNumber/pdf
// @access  Public
const downloadInvoicePDF = asyncHandler(async (req, res) => {
    const { invoiceNumber } = req.params;

    const purchase = await Purchase.findOne({ invoiceNumber })
        .populate('user', 'name email')
        .populate('course', 'title description category level')
        .populate('instructor', 'name');

    if (!purchase) {
        res.status(404);
        throw new Error('Invoice not found');
    }

    generateInvoicePDF(purchase, res);
});

module.exports = {
    createCheckoutSession,
    handleStripeWebhook,
    getMyPurchases,
    verifyPurchase,
    getSessionStatus,
    getInvoiceData,
    downloadInvoicePDF
};
