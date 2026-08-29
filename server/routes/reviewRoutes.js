const express = require('express');
const router = express.Router();
const {
    createReview,
    getCourseReviews,
    updateReview,
    deleteReview,
    markHelpful,
    getMyReview
} = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.get('/course/:courseId', getCourseReviews);

// Protected routes
router.post('/', protect, createReview);
router.get('/my/:courseId', protect, getMyReview);
router.put('/:id', protect, updateReview);
router.delete('/:id', protect, deleteReview);
router.post('/:id/helpful', protect, markHelpful);

module.exports = router;
