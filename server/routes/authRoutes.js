const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    googleLogin,
    getMe,
    updatePassword,
    updateProfile,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter, registerLimiter } = require('../middleware/rateLimiter');

// Helper middleware to inject role for specific endpoints
const setRole = (role) => (req, res, next) => {
    req.body.role = role;
    next();
};

// Generic endpoints
router.post('/register', registerLimiter, registerUser);
router.post('/login', authLimiter, loginUser);
router.post('/google', authLimiter, googleLogin);

// Student API set
router.post('/student/register', registerLimiter, setRole('student'), registerUser);
router.post('/student/login', authLimiter, setRole('student'), loginUser);
router.post('/student/google', authLimiter, setRole('student'), googleLogin);

// Teacher API set
router.post('/teacher/register', registerLimiter, setRole('instructor'), registerUser);
router.post('/teacher/login', authLimiter, setRole('instructor'), loginUser);
router.post('/teacher/google', authLimiter, setRole('instructor'), googleLogin);

// Admin API set
router.post('/admin/register', registerLimiter, setRole('admin'), registerUser);
router.post('/admin/login', authLimiter, setRole('admin'), loginUser);
router.post('/admin/google', authLimiter, setRole('admin'), googleLogin);

router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/updatepassword', protect, updatePassword);

module.exports = router;
