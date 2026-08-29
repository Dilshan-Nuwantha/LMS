const express = require('express');
const router = express.Router();
const {
    createCoupon,
    getCourseCoupons,
    updateCoupon,
    deleteCoupon,
    validateCoupon
} = require('../controllers/couponController');
const { protect, instructorOnly } = require('../middleware/authMiddleware');

// Validate coupon (any authenticated user)
router.post('/validate', protect, validateCoupon);

// Instructor-only routes
router.post('/', protect, instructorOnly, createCoupon);
router.get('/course/:courseId', protect, instructorOnly, getCourseCoupons);
router.put('/:id', protect, instructorOnly, updateCoupon);
router.delete('/:id', protect, instructorOnly, deleteCoupon);

module.exports = router;
