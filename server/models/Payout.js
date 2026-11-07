const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
    instructor: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    // What the instructor receives
    amount: {
        type: Number,
        required: true
    },
    // What was claimed, and the platform's share of it. Older payouts have neither.
    grossAmount: {
        type: Number
    },
    commissionAmount: {
        type: Number,
        default: 0
    },
    currency: {
        type: String,
        enum: ['LKR', 'USD'],
        default: 'LKR'
    },
    method: {
        type: String,
        enum: ['bank_transfer', 'upi', 'paypal'],
        required: true
    },
    transactionId: {
        type: String,
        default: ''
    },
    note: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    processedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

payoutSchema.index({ instructor: 1, createdAt: -1 });

// One open claim per currency, so two requests at once can't claim the same money
payoutSchema.index({ instructor: 1, currency: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });

module.exports = mongoose.model('Payout', payoutSchema);
