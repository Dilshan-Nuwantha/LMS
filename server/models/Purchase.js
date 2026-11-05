const mongoose = require('mongoose');
const Counter = require('./Counter');

const purchaseSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Course'
    },
    instructor: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        enum: ['LKR', 'USD'],
        default: 'LKR'
    },
    stripePaymentIntentId: {
        type: String,
        default: ''
    },
    // Empty for free enrollments (price 0 or 100% coupon)
    stripeSessionId: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'refunded', 'failed'],
        default: 'pending'
    },
    couponApplied: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon',
        default: null
    },
    discountAmount: {
        type: Number,
        default: 0
    },
    purchasedAt: {
        type: Date,
        default: Date.now
    },
    invoiceNumber: {
        type: String,
        unique: true,
        sparse: true
    },
    invoiceStatus: {
        type: String,
        enum: ['created', 'paid', 'refunded'],
        default: null
    },
    originalPrice: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Compound index to prevent duplicate purchases
purchaseSchema.index({ user: 1, course: 1 }, { unique: true });

// Generate next sequential invoice number

purchaseSchema.statics.generateInvoiceNumber = async function () {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const counterId = `invoice-${year}`;

    const lastInvoice = await this.findOne({
        invoiceNumber: { $regex: `^${prefix}` }
    }).sort({ invoiceNumber: -1 });

    let lastNum = 0;

    if (lastInvoice?.invoiceNumber) {
        lastNum = parseInt(
            lastInvoice.invoiceNumber.split('-').pop(),
            10
        );

        if (!Number.isInteger(lastNum)) {
            throw new Error('Invalid existing invoice number');
        }
    }

    try {
        await Counter.updateOne(
            { _id: counterId },
            { $setOnInsert: { seq: lastNum } },
            { upsert: true }
        );
    } catch (err) {
        if (err?.code !== 11000) {
            throw err;
        }
    }

    await Counter.updateOne(
        { _id: counterId },
        { $max: { seq: lastNum } }
    );

    const counter = await Counter.findOneAndUpdate(
        { _id: counterId },
        { $inc: { seq: 1 } },
        { new: true }
    );

    if (!counter) {
        throw new Error('Failed to generate invoice number');
    }

    return `${prefix}${String(counter.seq).padStart(5, '0')}`;
};

module.exports = mongoose.model('Purchase', purchaseSchema);
