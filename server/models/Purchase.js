const mongoose = require('mongoose');

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
        enum: ['INR', 'USD'],
        default: 'INR'
    },
    stripePaymentIntentId: {
        type: String,
        default: ''
    },
    stripeSessionId: {
        type: String,
        required: true
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
        enum: ['created', 'paid'],
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

    const lastInvoice = await this.findOne({
        invoiceNumber: { $regex: `^${prefix}` }
    }).sort({ invoiceNumber: -1 });

    let nextNum = 1;
    if (lastInvoice?.invoiceNumber) {
        const lastNum = parseInt(lastInvoice.invoiceNumber.split('-').pop(), 10);
        nextNum = lastNum + 1;
    }

    return `${prefix}${String(nextNum).padStart(5, '0')}`;
};

module.exports = mongoose.model('Purchase', purchaseSchema);
