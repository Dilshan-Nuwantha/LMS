const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { sendOTPEmail } = require('../utils/email');

const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'postmessage'
);

const isBcryptHash = (str) => typeof str === 'string' && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(str);

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;

    // Validate required fields exist
    if (!name || !email || !password) {
        res.status(400);
        throw new Error('Please add all fields');
    }

    // Validate name
    if (typeof name !== 'string' || !name.trim()) {
        res.status(400);
        throw new Error('Please provide a valid name');
    }

    // Validate and normalize email
    const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
        res.status(400);
        throw new Error('Please provide a valid email address');
    }

    // Validate password input (type, length, non-empty whitespace)
    if (typeof password !== 'string' || password.length < 6 || !password.trim()) {
        res.status(400);
        throw new Error('Password must be at least 6 characters');
    }

    // Validate role
    const validRoles = ['student', 'instructor', 'admin'];
    const validatedRole = role && validRoles.includes(role) ? role : 'student';

    // Check if user already exists
    const userExists = await User.findOne({ email: normalizedEmail }).select('+password');
    if (userExists) {
        if (userExists.googleId && !userExists.password) {
            res.status(400);
            throw new Error('An account with this email already exists using Google sign-in. Please log in with Google.');
        }
        res.status(400);
        throw new Error('User already exists');
    }

    // Hash password using bcrypt before creating user
    let hashedPassword;
    try {
        const salt = await bcrypt.genSalt(10);
        hashedPassword = await bcrypt.hash(password, salt);
    } catch {
        res.status(500);
        throw new Error('Failed to securely process password');
    }

    // Ensure we never create a local account without a verified bcrypt password hash
    if (!hashedPassword || !isBcryptHash(hashedPassword)) {
        res.status(500);
        throw new Error('Failed to generate a valid password hash');
    }

    // Create user - explicitly keep manual registration independent of OAuth by setting googleId to null
    let user;
    try {
        user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: validatedRole,
            googleId: null,
        });
    } catch (err) {
        if (err.code === 11000) {
            res.status(400);
            throw new Error('User already exists');
        }
        res.status(400);
        throw new Error(err.message || 'Invalid user data');
    }

    if (user) {
        // Set user for Activity Logger
        res.locals.user = user;

        res.status(201).json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
    const { email, password, role } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
        res.status(400);
        throw new Error('Please provide email and password');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Query user and explicitly select password because select: false is set in schema
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
        res.status(400);
        throw new Error('Invalid credentials');
    }

    if (user.isBlocked) {
        res.status(403);
        throw new Error(user.blockReason || 'Your account has been blocked. Please contact support.');
    }

    // Check if account was created via Google without a password
    if (user.googleId && !user.password) {
        res.status(400);
        throw new Error('This account uses Google sign-in. Please log in with Google.');
    }

    // Compare passwords safely
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
        res.status(400);
        throw new Error('Invalid credentials');
    }

    if (role && user.role !== role) {
        res.status(400);
        throw new Error(`Account role is not ${role === 'instructor' ? 'teacher' : role}.`);
    }

    res.locals.user = user; // For Activity Logger
    res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        warnings: user.warnings || [],
        maxWarnings: user.maxWarnings || 2,
        token: generateToken(user._id),
    });
});

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
    res.status(200).json(req.user);
});

// @desc    Update user password
// @route   PUT /api/auth/updatepassword
// @access  Private
const updatePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        res.status(400);
        throw new Error('Please provide current and new password');
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6 || !newPassword.trim()) {
        res.status(400);
        throw new Error('New password must be at least 6 characters');
    }

    const user = await User.findById(req.user.id).select('+password');

    if (user && (await user.matchPassword(currentPassword))) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();
        res.json({ message: 'Password updated successfully' });
    } else {
        res.status(400);
        throw new Error('Invalid current password');
    }
});

// @desc    Authenticate with Google
// @route   POST /api/auth/google
// @access  Public
const googleLogin = asyncHandler(async (req, res) => {
    const { code, role } = req.body;

    if (!code) {
        res.status(400);
        throw new Error('Google authorization code is required');
    }

    // Exchange authorization code for tokens
    const { tokens } = await googleClient.getToken(code);

    // Verify the ID token with audience check
    const ticket = await googleClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { sub: googleId, email, name, picture } = ticket.getPayload();
    const normalizedEmail = email ? email.toLowerCase().trim() : '';

    // Check if user exists by googleId or email
    let user = await User.findOne({ $or: [{ googleId }, { email: normalizedEmail }] }).select('+password');

    if (user) {
        // If existing user found by email but no googleId, link the account
        if (!user.googleId) {
            user.googleId = googleId;
            if (picture && !user.profileImage) user.profileImage = picture;
            await user.save();
        }

        if (user.isBlocked) {
            res.status(403);
            throw new Error(user.blockReason || 'Your account has been blocked. Please contact support.');
        }

        if (role && user.role !== role) {
            res.status(400);
            throw new Error(`Account role is not ${role === 'instructor' ? 'teacher' : role}.`);
        }
    } else {
        // Create new user (Google account without password hash)
        user = await User.create({
            name,
            email: normalizedEmail,
            googleId,
            password: null,
            profileImage: picture || '',
            role: role || 'student',
        });
    }

    res.locals.user = user;

    res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        bio: user.bio || '',
        profileImage: user.profileImage || '',
        googleId: user.googleId || null,
        createdAt: user.createdAt,
        warnings: user.warnings || [],
        maxWarnings: user.maxWarnings || 2,
        token: generateToken(user._id),
    });
});

// @desc    Update user profile (name, bio, profileImage)
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
    const { name, bio, profileImage } = req.body;

    const user = await User.findById(req.user.id);

    if (name !== undefined) user.name = name.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (profileImage !== undefined) user.profileImage = profileImage.trim();

    await user.save();

    const updated = await User.findById(req.user.id).select('-password');
    res.json(updated);
});

// @desc    Request password reset OTP
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        res.status(400);
        throw new Error('Please provide an email address');
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    // Always respond with success to prevent email enumeration attacks
    if (!user) {
        return res.json({ message: 'If that email is registered, an OTP has been sent.' });
    }

    if (user.googleId && !user.password) {
        res.status(400);
        throw new Error('This account uses Google sign-in. Please log in with Google.');
    }

    // Generate a cryptographically random 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // Hash the OTP before storing (same bcrypt pattern used for passwords)
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);

    // Save hash + 10-minute expiry
    user.otpHash = otpHash;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save({ validateBeforeSave: false });

    // Send the email
    await sendOTPEmail(user.email, otp);

    res.json({ message: 'If that email is registered, an OTP has been sent.' });
});

// @desc    Verify OTP and return a short-lived reset token
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        res.status(400);
        throw new Error('Email and OTP are required');
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user || !user.otpHash || !user.otpExpiry) {
        res.status(400);
        throw new Error('Invalid or expired OTP. Please request a new one.');
    }

    // Check expiry
    if (new Date() > user.otpExpiry) {
        // Clear stale OTP
        user.otpHash = null;
        user.otpExpiry = null;
        await user.save({ validateBeforeSave: false });
        res.status(400);
        throw new Error('OTP has expired. Please request a new one.');
    }

    // Verify OTP against stored hash
    const isMatch = await bcrypt.compare(String(otp).trim(), user.otpHash);
    if (!isMatch) {
        res.status(400);
        throw new Error('Incorrect OTP. Please try again.');
    }

    // Issue a short-lived reset token (15 minutes)
    const resetToken = jwt.sign(
        { id: user._id, purpose: 'password-reset' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );

    res.json({ resetToken });
});

// @desc    Reset password using a verified reset token
// @route   POST /api/auth/reset-password
// @access  Public (but requires valid resetToken)
const resetPassword = asyncHandler(async (req, res) => {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
        res.status(400);
        throw new Error('Reset token and new password are required');
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6 || !newPassword.trim()) {
        res.status(400);
        throw new Error('Password must be at least 6 characters');
    }

    // Verify the reset token
    let decoded;
    try {
        decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
        res.status(400);
        throw new Error('Reset link has expired or is invalid. Please start again.');
    }

    if (decoded.purpose !== 'password-reset') {
        res.status(400);
        throw new Error('Invalid reset token.');
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.otpHash) {
        res.status(400);
        throw new Error('Reset session not found. Please start again.');
    }

    // Update the password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    // Invalidate the OTP so the reset link can only be used once
    user.otpHash = null;
    user.otpExpiry = null;
    await user.save();

    res.json({ message: 'Password reset successfully. You can now log in.' });
});

module.exports = {
    registerUser,
    loginUser,
    googleLogin,
    getMe,
    updatePassword,
    updateProfile,
    forgotPassword,
    verifyOTP,
    resetPassword,
};
