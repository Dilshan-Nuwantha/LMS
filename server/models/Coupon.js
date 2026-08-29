const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, 'Please add a coupon code'],
        uppercase: true,
        trim: true
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
    discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: true
    },
    discountValue: {
        type: Number,
        required: [true, 'Please add a discount value']
    },
    maxUses: {
        type: Number,
        default: null // null means unlimited
    },
    usedCount: {
        type: Number,
        default: 0
    },
    validFrom: {
        type: Date,
        default: Date.now
    },
    validUntil: {
        type: Date,
        required: [true, 'Please add an expiry date']
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Compound unique index: same code can exist for different courses
couponSchema.index({ code: 1, course: 1 }, { unique: true });

// Method to check if coupon is valid
couponSchema.methods.isValid = function () {
    const now = new Date();

    if (!this.isActive) return { valid: false, reason: 'Coupon is inactive' };
    if (now < this.validFrom) return { valid: false, reason: 'Coupon is not yet active' };
    if (now > this.validUntil) return { valid: false, reason: 'Coupon has expired' };
    if (this.maxUses !== null && this.usedCount >= this.maxUses) {
        return { valid: false, reason: 'Coupon usage limit reached' };
    }

    return { valid: true };
};

// Method to calculate discount
couponSchema.methods.calculateDiscount = function (originalPrice) {
    if (this.discountType === 'percentage') {
        return Math.round((originalPrice * this.discountValue) / 100);
    } else {
        return Math.min(this.discountValue, originalPrice);
    }
};

module.exports = mongoose.model('Coupon', couponSchema);
