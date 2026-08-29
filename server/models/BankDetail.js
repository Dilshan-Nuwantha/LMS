const mongoose = require('mongoose');

const bankDetailSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
        unique: true
    },
    accountHolderName: {
        type: String,
        required: [true, 'Please add account holder name']
    },
    bankName: {
        type: String,
        default: ''
    },
    accountNumber: {
        type: String,
        default: ''
    },
    ifscCode: {
        type: String,
        default: ''
    },
    upiId: {
        type: String,
        default: ''
    },
    paypalEmail: {
        type: String,
        default: ''
    },
    preferredMethod: {
        type: String,
        enum: ['bank_transfer', 'upi', 'paypal'],
        default: 'bank_transfer'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('BankDetail', bankDetailSchema);
