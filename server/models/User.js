const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const isBcryptHash = (str) => typeof str === 'string' && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(str);

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [
            function () {
                return !this.googleId;
            },
            'Please add a password'
        ],
        validate: {
            validator: function (value) {
                // Allow null or undefined password ONLY if account has a googleId
                if (this.googleId && (value === null || value === undefined)) {
                    return true;
                }
                // When password is provided or account is local:
                // Must be either a valid bcrypt hash, or a plaintext string of at least 6 characters before save
                if (typeof value !== 'string') return false;
                return isBcryptHash(value) || value.trim().length >= 6;
            },
            message: 'Password must be at least 6 characters or a valid bcrypt hash'
        },
        default: null,
        select: false,
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
    // Becoming an instructor needs an admin's approval
    instructorRequest: {
        status: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
        note: { type: String, default: '' },
        requestedAt: { type: Date, default: null }
    },
    stripeAccountId: {
        type: String,
        default: ''
    },
    // Password reset OTP fields
    otpHash:   { type: String, default: null, select: false },
    otpExpiry: { type: Date,   default: null, select: false },
    otpAttempts: { type: Number, default: 0, select: false },
    // Raised when the password changes, which ends every older login token
    tokenVersion: { type: Number, default: 0 },
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
    if (!enteredPassword || !this.password || typeof enteredPassword !== 'string') {
        return false;
    }
    return await bcrypt.compare(enteredPassword, this.password);
};

// Find an account by email. The second lookup covers accounts stored with capitals
// before emails were normalized, until scripts/normalizeUserEmails.js has been run.
userSchema.statics.findByEmail = async function (email, projection = '') {
    const normalized = String(email ?? '').toLowerCase().trim();
    return await this.findOne({ email: normalized }).select(projection)
        || await this.findOne({ email: normalized }).collation({ locale: 'en', strength: 2 }).select(projection);
};

// Encrypt password using bcrypt
userSchema.pre('save', async function () {
    if (!this.isModified('password') || !this.password) {
        return;
    }
    // Prevent double hashing if already a valid bcrypt hash
    if (isBcryptHash(this.password)) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model('User', userSchema);
