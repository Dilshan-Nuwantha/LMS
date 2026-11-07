const mongoose = require('mongoose');

// An instructor paying the platform its commission on slip sales they collected themselves
const commissionPaymentSchema = new mongoose.Schema({
    instructor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: [0.01, 'Amount must be more than 0']
    },
    currency: {
        type: String,
        enum: ['LKR', 'USD'],
        default: 'LKR'
    },
    reference: {
        type: String,
        default: ''
    },
    proof: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Upload',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    note: {
        type: String,
        default: ''
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

commissionPaymentSchema.index({ instructor: 1, createdAt: -1 });

// One payment under review per currency, so two sent together can't pay the same balance
commissionPaymentSchema.index({ instructor: 1, currency: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });

module.exports = mongoose.model('CommissionPayment', commissionPaymentSchema);
