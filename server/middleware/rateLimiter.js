const rateLimit = require('express-rate-limit');

const isDevelopment = process.env.NODE_ENV !== 'production';

// Skip rate limiting in development
const skipInDev = () => isDevelopment;

// General API rate limiter - 300 requests per 15 minutes
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300,
    message: {
        message: 'Too many requests. Please wait a few minutes before trying again.',
        retryAfter: 15
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipInDev,
});

// Stricter limiter for authentication routes - 5 attempts per 15 minutes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: {
        message: 'Too many login attempts. Please try again after 15 minutes.',
        retryAfter: 15
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipInDev,
});

// Registration limiter - 3 accounts per hour per IP
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: {
        message: 'Too many accounts created. Please try again after an hour.',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipInDev,
});

// Course creation limiter - 10 courses per hour
const createCourseLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: {
        message: 'Course creation limit reached. Please try again later.',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipInDev,
});

module.exports = {
    apiLimiter,
    authLimiter,
    registerLimiter,
    createCourseLimiter
};