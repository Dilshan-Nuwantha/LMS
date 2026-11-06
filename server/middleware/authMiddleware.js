
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer ')
    ) {
        token = req.headers.authorization.split(' ')[1];

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Password reset tokens only work on the reset route
            if (decoded.purpose) {
                return res.status(401).json({
                    code: 'INVALID_TOKEN',
                    message: 'Invalid authentication token.'
                });
            }

            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({
                    code: 'USER_NOT_FOUND',
                    message: 'User account not found. Please log in again.'
                });
            }

            if ((decoded.v ?? 0) !== (req.user.tokenVersion ?? 0)) {
                return res.status(401).json({
                    code: 'SESSION_REVOKED',
                    message: 'Your session has expired. Please log in again.'
                });
            }

            if (req.user.isBlocked) {
                return res.status(403).json({
                    code: 'ACCOUNT_BLOCKED',
                    message: 'Your account has been blocked. Please contact support.'
                });
            }

            // Set on impersonation tokens, so actions are recorded against the admin
            req.impersonatedBy = decoded.imp;

            return next();

        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    code: 'TokenExpired',
                    message: 'Your session has expired. Please log in again.'
                });
            }

            if (
                error.name === 'JsonWebTokenError' ||
                error.name === 'NotBeforeError'
            ) {
                return res.status(401).json({
                    code: 'INVALID_TOKEN',
                    message: 'Invalid authentication token.'
                });
            }

            throw error;
        }
    }

    return res.status(401).json({
        code: 'NO_TOKEN',
        message: 'Not authorized. No token provided.'
    });
});

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return next();
    }

    return res.status(403).json({
        code: 'ADMIN_ACCESS_REQUIRED',
        message: 'Not authorized as an admin.'
    });
};

const instructorOnly = (req, res, next) => {
    if (req.user && (
        req.user.role === 'instructor' ||
        req.user.role === 'admin'
    )) {
        return next();
    }

    return res.status(403).json({
        code: 'INSTRUCTOR_ACCESS_REQUIRED',
        message: 'Not authorized. Instructor access required.'
    });
};

module.exports = { protect, admin, instructorOnly };
