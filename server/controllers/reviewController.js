const asyncHandler = require('express-async-handler');
const Review = require('../models/Review');
const Course = require('../models/Course');
const Purchase = require('../models/Purchase');

// @desc    Create a review
// @route   POST /api/reviews
// @access  Private
const createReview = asyncHandler(async (req, res) => {
    const { courseId, rating, comment } = req.body;

    if (!courseId || !rating) {
        res.status(400);
        throw new Error('Please provide course ID and rating');
    }

    if (rating < 1 || rating > 5) {
        res.status(400);
        throw new Error('Rating must be between 1 and 5');
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    // Check if user is the course owner (can't review own course)
    if (course.user.toString() === req.user.id) {
        res.status(400);
        throw new Error('You cannot review your own course');
    }

    // Check if user has purchased the course (marketplace courses only)
    if (course.isMarketplace) {
        const purchase = await Purchase.findOne({
            user: req.user.id,
            course: courseId,
            status: 'completed'
        });

        if (!purchase) {
            res.status(403);
            throw new Error('You must purchase the course before leaving a review');
        }
    }

    // Check if user already reviewed this course
    const existingReview = await Review.findOne({
        user: req.user.id,
        course: courseId
    });

    if (existingReview) {
        res.status(400);
        throw new Error('You have already reviewed this course');
    }

    const review = await Review.create({
        user: req.user.id,
        course: courseId,
        rating,
        comment: comment || ''
    });

    // Populate user info
    await review.populate('user', 'name profileImage');

    res.status(201).json(review);
});

// @desc    Get all reviews for a course
// @route   GET /api/reviews/course/:courseId
// @access  Public
const getCourseReviews = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { page = 1, limit = 10, sortBy = 'newest' } = req.query;

    const course = await Course.findById(courseId);
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    let sort = {};
    switch (sortBy) {
        case 'newest':
            sort = { createdAt: -1 };
            break;
        case 'oldest':
            sort = { createdAt: 1 };
            break;
        case 'highest':
            sort = { rating: -1 };
            break;
        case 'lowest':
            sort = { rating: 1 };
            break;
        case 'helpful':
            sort = { helpful: -1 };
            break;
        default:
            sort = { createdAt: -1 };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const reviews = await Review.find({ course: courseId })
        .populate('user', 'name profileImage')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit));

    const total = await Review.countDocuments({ course: courseId });

    // Rating distribution
    const ratingDistribution = await Review.aggregate([
        { $match: { course: course._id } },
        {
            $group: {
                _id: '$rating',
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: -1 } }
    ]);

    res.status(200).json({
        reviews,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
        },
        ratingDistribution
    });
});

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private (Owner)
const updateReview = asyncHandler(async (req, res) => {
    const review = await Review.findById(req.params.id);

    if (!review) {
        res.status(404);
        throw new Error('Review not found');
    }

    if (review.user.toString() !== req.user.id) {
        res.status(403);
        throw new Error('Not authorized to update this review');
    }

    const { rating, comment } = req.body;

    if (rating !== undefined) {
        if (rating < 1 || rating > 5) {
            res.status(400);
            throw new Error('Rating must be between 1 and 5');
        }
        review.rating = rating;
    }

    if (comment !== undefined) {
        review.comment = comment;
    }

    await review.save();
    await review.populate('user', 'name profileImage');

    res.status(200).json(review);
});

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private (Owner or Admin)
const deleteReview = asyncHandler(async (req, res) => {
    const review = await Review.findById(req.params.id);

    if (!review) {
        res.status(404);
        throw new Error('Review not found');
    }

    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Not authorized to delete this review');
    }

    const courseId = review.course;
    await review.deleteOne();

    res.status(200).json({ id: req.params.id });
});

// @desc    Mark review as helpful
// @route   POST /api/reviews/:id/helpful
// @access  Private
const markHelpful = asyncHandler(async (req, res) => {
    const review = await Review.findByIdAndUpdate(
        req.params.id,
        { $inc: { helpful: 1 } },
        { new: true }
    );

    if (!review) {
        res.status(404);
        throw new Error('Review not found');
    }

    res.status(200).json({ helpful: review.helpful });
});

// @desc    Get user's review for a course
// @route   GET /api/reviews/my/:courseId
// @access  Private
const getMyReview = asyncHandler(async (req, res) => {
    const review = await Review.findOne({
        user: req.user.id,
        course: req.params.courseId
    });

    res.status(200).json(review);
});

module.exports = {
    createReview,
    getCourseReviews,
    updateReview,
    deleteReview,
    markHelpful,
    getMyReview
};
