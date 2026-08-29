const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'postmessage'
);

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public (or Admin only later)
const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
        res.status(400);
        throw new Error('Please add all fields');
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    // Create user
    const user = await User.create({
        name,
        email,
        password,
        role: role || 'student', // Default to student
    });

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

    // Check for user email
    const user = await User.findOne({ email });

    if (user && user.isBlocked) {
        res.status(403);
        throw new Error(user.blockReason || 'Your account has been blocked. Please contact support.');
    }

    if (user && (await user.matchPassword(password))) {
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
    } else {
        res.status(400);
        throw new Error('Invalid credentials');
    }
});

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
    res.status(200).json(req.user);
});

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Update user password
// @route   PUT /api/auth/updatepassword
// @access  Private
const updatePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);

    if (user && (await user.matchPassword(currentPassword))) {
        user.password = newPassword;
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

    // Check if user exists by googleId or email
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

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
        // Create new user
        user = await User.create({
            name,
            email,
            googleId,
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

module.exports = {
    registerUser,
    loginUser,
    googleLogin,
    getMe,
    updatePassword,
    updateProfile,
};
