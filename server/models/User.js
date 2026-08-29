const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true
    },
    password: {
        type: String,
        required: [function () { return !this.googleId; }, 'Please add a password']
    },
    googleId: {
        type: String,
        default: null,
        sparse: true
    },
    role: {
        type: String,
        enum: ['admin', 'student', 'instructor'],
        default: 'student'
    },
    // Instructor profile fields
    bio: {
        type: String,
        default: ''
    },
    profileImage: {
        type: String,
        default: ''
    },
    stripeAccountId: {
        type: String,
        default: ''
    },
    // Block fields
    isBlocked: { type: Boolean, default: false },
    blockReason: { type: String, default: '' },
    blockedAt: { type: Date, default: null },
    blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Warning fields
    warnings: [{
        reason: { type: String, required: true },
        issuedAt: { type: Date, default: Date.now },
        issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],
    maxWarnings: { type: Number, default: 2 }
}, {
    timestamps: true
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Encrypt password using bcrypt
userSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model('User', userSchema);
