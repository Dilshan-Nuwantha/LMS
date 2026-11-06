const asyncHandler = require('express-async-handler');
const stripe = require('../config/stripe');
const Course = require('../models/Course');
const Purchase = require('../models/Purchase');
const Progress = require('../models/Progress');
const Coupon = require('../models/Coupon');
const { generateInvoicePDF } = require('../services/invoiceService');
const {
    createPurchaseWithInvoice,
    isDuplicateKey
} = require('../services/purchaseService');

const requireStripe = () => {
    if (!stripe) {
        const error = new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in server/.env.');
        error.statusCode = 503;
        throw error;
    }

    return stripe;
};

// Takes one use of a coupon in a single step, so parallel checkouts can't pass its limit
const reserveCouponUse = (couponId) => Coupon.findOneAndUpdate(
    { _id: couponId, $or: [{ maxUses: null }, { $expr: { $lt: ['$usedCount', '$maxUses'] } }] },
    { $inc: { usedCount: 1 } }
);

// Enroll the student once a purchase is completed (paid or free)
const grantCourseAccess = async ({ userId, courseId, couponId }) => {
    if (couponId) {
        await Coupon.findByIdAndUpdate(couponId, {
            $inc: { usedCount: 1 }
        });
    }

    await Course.findByIdAndUpdate(courseId, {
        $inc: { enrollmentCount: 1 }
    });

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
        status: 'Published',
        isAdminBlocked: { $ne: true }
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
        const stillEnrolled = await Progress.exists({ student: req.user.id, course: courseId });
        if (stillEnrolled) {
            res.status(400);
            throw new Error('You have already purchased this course');
        }

        // Paid but removed from the course: give access back without charging again
        await grantCourseAccess({ userId: req.user.id, courseId });

        return res.status(200).json({
            enrolled: true,
            invoiceNumber: existingPurchase.invoiceNumber
        });
    }

    // Check if user is the course owner
    if (course.user.toString() === req.user.id) {
        res.status(400);
        throw new Error('You cannot purchase your own course');
    }

    // An instructor may have enrolled this student already, so there is nothing to pay for
    if (await Progress.exists({ student: req.user.id, course: courseId })) {
        res.status(400);
        throw new Error('You are already enrolled in this course');
    }

    let finalPrice = course.price;
    let discountAmount = 0;
    let couponApplied = null;

    // Apply coupon if provided - reject instead of silently charging full price
    if (couponCode) {
        if (typeof couponCode !== 'string') {
            res.status(400);
            throw new Error('Invalid coupon code');
        }

        const coupon = await Coupon.findOne({
            code: couponCode.toUpperCase(),
            course: courseId
        });

        if (!coupon) {
            res.status(400);
            throw new Error('Invalid coupon code');
        }

        const validity = coupon.isValid();
        if (!validity.valid) {
            res.status(400);
            throw new Error(validity.reason);
        }

        discountAmount = coupon.calculateDiscount(course.price);
        finalPrice = Math.max(Math.round((course.price - discountAmount) * 100) / 100, 0);
        couponApplied = coupon._id;
    }

    // Remove any previous pending/failed purchase to avoid duplicate key error.
    // If that older Stripe session still gets paid, the webhook re-attaches it by user + course.
    await Purchase.deleteOne({
        user: req.user.id,
        course: courseId,
        status: { $in: ['pending', 'failed'] }
    });

    // Free course or 100% coupon: enroll directly without Stripe
    if (finalPrice <= 0) {
        if (couponApplied && !(await reserveCouponUse(couponApplied))) {
            res.status(400);
            throw new Error('Coupon usage limit reached');
        }

        const purchase = await createPurchaseWithInvoice({
            user: req.user.id,
            course: courseId,
            instructor: course.user,
            amount: 0,
            originalPrice: course.price,
            currency: course.currency,
            status: 'completed',
            couponApplied: couponApplied,
            discountAmount: discountAmount,
            purchasedAt: new Date(),
            invoiceStatus: 'paid'
        });

        await grantCourseAccess({ userId: req.user.id, courseId });

        return res.status(200).json({
            enrolled: true,
            invoiceNumber: purchase.invoiceNumber
        });
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    const productData = { name: course.title };
    if (course.description) {
        productData.description = course.description.substring(0, 500);
    }
    // Stripe only accepts absolute https image URLs
    if (/^https:\/\//i.test(course.thumbnail || '')) {
        productData.images = [course.thumbnail];
    }

    // Create Stripe checkout session
    const stripeClient = requireStripe();

    let session;
    try {
        session = await stripeClient.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: course.currency.toLowerCase(),
                        product_data: productData,
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
                discountAmount: discountAmount.toString(),
                originalPrice: course.price.toString()
            }
        });
    } catch (err) {
        // e.g. amount below Stripe's minimum charge (about USD 0.50) or an unsupported currency
        if (err.type === 'StripeInvalidRequestError') {
            res.status(400);
            throw new Error(`Payment could not be started: ${err.message}`);
        }
        throw err;
    }

    // Create pending purchase record with invoice
    await createPurchaseWithInvoice({
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
        case 'charge.refunded':
            await handleRefund(event.data.object);
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.status(200).json({ received: true });
});

// Helper function to handle successful payment.
// Safe to call more than once for the same session (webhook retries + success page check).
const handleSuccessfulPayment = async (session) => {
    const { courseId, userId, instructorId, couponId, discountAmount, originalPrice } = session.metadata || {};

    if (!courseId || !userId) {
        console.error('Checkout session is missing purchase metadata:', session.id);
        return;
    }

    if (session.payment_status !== 'paid') {
        return;
    }

    const paidFields = {
        status: 'completed',
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent,
        amount: session.amount_total / 100,
        currency: session.currency.toUpperCase(),
        couponApplied: couponId || null,
        discountAmount: Number(discountAmount) || 0,
        purchasedAt: new Date(),
        invoiceStatus: 'paid'
    };

    // Atomic: only the first caller flips the purchase to completed, so counters are bumped once.
    // Matched by user + course so a payment from an older (replaced) checkout session still lands.
    // The payment-intent check stops a replayed event for an already refunded payment from
    // granting access again.
    let purchase = await Purchase.findOneAndUpdate(
        {
            user: userId,
            course: courseId,
            status: { $ne: 'completed' },
            stripePaymentIntentId: { $ne: session.payment_intent }
        },
        paidFields,
        { new: true }
    );

    if (!purchase) {
        const existing = await Purchase.findOne({ user: userId, course: courseId, status: { $in: ['completed', 'refunded'] } });
        if (existing?.status === 'refunded') {
            return; // replay of a payment that was already refunded
        }
        if (existing) {
            if (existing.stripeSessionId !== session.id) {
                console.warn(`Duplicate payment: session ${session.id} paid for course ${courseId} that user ${userId} already owns. Refund payment ${session.payment_intent} in Stripe.`);
            }
            return;
        }

        // The pending record was removed (e.g. replaced by a newer checkout) - recreate it
        try {
            purchase = await createPurchaseWithInvoice({
                user: userId,
                course: courseId,
                instructor: instructorId,
                originalPrice: Number(originalPrice) || paidFields.amount,
                ...paidFields
            });
        } catch (err) {
            // Another request created it at the same moment and already granted access
            if (isDuplicateKey(err)) return;
            throw err;
        }
    }

    await grantCourseAccess({ userId, courseId, couponId });

    console.log(`Payment successful for course ${courseId} by user ${userId}`);
};

// Helper function to handle a refund made in Stripe: a full refund removes course access.
// A partial refund (e.g. a goodwill discount) keeps access.
const handleRefund = async (charge) => {
    if (!charge.refunded) {
        console.log(`Partial refund on payment ${charge.payment_intent} - course access kept`);
        return;
    }

    // Only matches the payment that bought the course, so refunding a duplicate payment keeps access
    const purchase = await Purchase.findOneAndUpdate(
        { stripePaymentIntentId: charge.payment_intent, status: 'completed' },
        { status: 'refunded', invoiceStatus: 'refunded' },
        { new: true }
    );

    if (!purchase) {
        return;
    }

    // A student the instructor already removed was taken off the count at that point
    const removed = await Progress.deleteOne({ student: purchase.user, course: purchase.course });
    if (removed.deletedCount > 0) {
        await Course.findByIdAndUpdate(purchase.course, {
            $inc: { enrollmentCount: -1 }
        });
    }

    console.log(`Refund processed for course ${purchase.course} by user ${purchase.user} - access removed`);
};

// Helper function to handle expired session
const handleExpiredSession = async (session) => {
    await Purchase.findOneAndUpdate(
        { stripeSessionId: session.id, status: 'pending' },
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

    const findPurchase = () => Purchase.findOne({
        stripeSessionId: sessionId,
        user: req.user.id
    }).populate('course', 'title');

    let purchase = await findPurchase();

    // If missing or still pending, verify directly with Stripe (handles cases where webhook hasn't fired)
    if (!purchase || purchase.status === 'pending') {
        try {
            const session = await requireStripe().checkout.sessions.retrieve(sessionId);
            if (session.metadata?.userId === req.user.id && session.payment_status === 'paid') {
                await handleSuccessfulPayment(session);
                purchase = await findPurchase();
            }
        } catch (err) {
            console.error('Stripe session verification failed:', err.message);
        }
    }

    if (!purchase) {
        res.status(404);
        throw new Error('Session not found');
    }

    res.status(200).json({
        status: purchase.status,
        course: purchase.course
    });
});

// Load an invoice the current user may see: the student who bought it, the
// course instructor, or an admin. Anyone else gets the same 404 as a missing
// invoice, so invoice numbers can't be probed.
const findInvoiceForUser = async (req, res) => {
    const purchase = await Purchase.findOne({ invoiceNumber: req.params.invoiceNumber })
        .populate('user', 'name email')
        .populate('course', 'title description category level')
        .populate('instructor', 'name');

    const canView = purchase && (
        req.user.role === 'admin' ||
        purchase.user?._id.toString() === req.user.id ||
        purchase.instructor?._id.toString() === req.user.id
    );

    if (!canView) {
        res.status(404);
        throw new Error('Invoice not found');
    }

    return purchase;
};

// @desc    Get invoice data
// @route   GET /api/purchase/invoice/:invoiceNumber
// @access  Private (student, course instructor, admin)
const getInvoiceData = asyncHandler(async (req, res) => {
    const purchase = await findInvoiceForUser(req, res);

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
// @access  Private (student, course instructor, admin)
const downloadInvoicePDF = asyncHandler(async (req, res) => {
    const purchase = await findInvoiceForUser(req, res);

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
