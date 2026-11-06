const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    googleLogin,
    getMe,
    updatePassword,
    updateProfile,
    forgotPassword,
    verifyOTP,
    resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter, loginAccountLimiter, registerLimiter, otpLimiter } = require('../middleware/rateLimiter');

// Helper middleware to inject role for specific endpoints
const setRole = (role) => (req, res, next) => {
    req.body.role = role;
    next();
};

// Generic endpoints
router.post('/register', registerLimiter, setRole('student'), registerUser);
router.post('/login', authLimiter, loginAccountLimiter, loginUser);
router.post('/google', authLimiter, googleLogin);

// Student API set
router.post('/student/register', registerLimiter, setRole('student'), registerUser);
router.post('/student/login', authLimiter, loginAccountLimiter, setRole('student'), loginUser);
router.post('/student/google', authLimiter, setRole('student'), googleLogin);

// Teacher API set
router.post('/teacher/register', registerLimiter, setRole('instructor'), registerUser);
router.post('/teacher/login', authLimiter, loginAccountLimiter, setRole('instructor'), loginUser);
router.post('/teacher/google', authLimiter, setRole('instructor'), googleLogin);

// Admin API set (no register route: admins are created with scripts/createAdmin.js)
router.post('/admin/login', authLimiter, loginAccountLimiter, setRole('admin'), loginUser);
router.post('/admin/google', authLimiter, setRole('admin'), googleLogin);

router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/updatepassword', protect, updatePassword);

// Password recovery via OTP
router.post('/forgot-password', otpLimiter, forgotPassword);
router.post('/verify-otp', otpLimiter, verifyOTP);
router.post('/reset-password', authLimiter, resetPassword);

module.exports = router;
