const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
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

module.exports = mongoose.model('Payout', payoutSchema);
