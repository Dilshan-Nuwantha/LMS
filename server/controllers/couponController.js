const asyncHandler = require('express-async-handler');
const Coupon = require('../models/Coupon');
const Course = require('../models/Course');

// @desc    Create a coupon
// @route   POST /api/coupons
// @access  Private (Instructor)
const createCoupon = asyncHandler(async (req, res) => {
    const {
        code,
        courseId,
        discountType,
        discountValue,
        maxUses,
        validFrom,
        validUntil
    } = req.body;

    // Validate required fields
    if (!code || !courseId || !discountType || discountValue === undefined || !validUntil) {
        res.status(400);
        throw new Error('Please provide all required fields');
    }

    // Verify course ownership
    const course = await Course.findById(courseId);
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    if (course.user.toString() !== req.user.id && req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Not authorized to create coupon for this course');
    }

    // Validate discount value
    if (discountType === 'percentage' && (discountValue < 1 || discountValue > 100)) {
        res.status(400);
        throw new Error('Percentage discount must be between 1 and 100');
    }

    if (discountType === 'fixed' && discountValue >= course.price) {
        res.status(400);
        throw new Error('Fixed discount cannot be greater than or equal to course price');
    }

    // Check if coupon code already exists for this course
    const existingCoupon = await Coupon.findOne({
        code: code.toUpperCase(),
        course: courseId
    });

    if (existingCoupon) {
        res.status(400);
        throw new Error('Coupon code already exists for this course');
    }

    const coupon = await Coupon.create({
        code: code.toUpperCase(),
        course: courseId,
        instructor: req.user.id,
        discountType,
        discountValue,
        maxUses: maxUses || null,
        validFrom: validFrom || new Date(),
        validUntil: new Date(validUntil),
        isActive: true
    });

    res.status(201).json(coupon);
});

// @desc    Get all coupons for a course
// @route   GET /api/coupons/course/:courseId
// @access  Private (Instructor, Owner)
const getCourseCoupons = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Verify course ownership
    const course = await Course.findById(courseId);
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    if (course.user.toString() !== req.user.id && req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Not authorized');
    }

    const count = await Coupon.countDocuments({ course: courseId });
    const coupons = await Coupon.find({ course: courseId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

    res.status(200).json({
        coupons,
        page,
        pages: Math.ceil(count / limit),
        total: count
    });
});

// @desc    Update a coupon
// @route   PUT /api/coupons/:id
// @access  Private (Instructor, Owner)
const updateCoupon = asyncHandler(async (req, res) => {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
        res.status(404);
        throw new Error('Coupon not found');
    }

    if (coupon.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Not authorized');
    }

    const {
        discountType,
        discountValue,
        maxUses,
        validFrom,
        validUntil,
        isActive
    } = req.body;

    if (discountType !== undefined) coupon.discountType = discountType;
    if (discountValue !== undefined) coupon.discountValue = discountValue;
    if (maxUses !== undefined) coupon.maxUses = maxUses;
    if (validFrom !== undefined) coupon.validFrom = new Date(validFrom);
    if (validUntil !== undefined) coupon.validUntil = new Date(validUntil);
    if (isActive !== undefined) coupon.isActive = isActive;

    await coupon.save();

    res.status(200).json(coupon);
});

// @desc    Delete a coupon
// @route   DELETE /api/coupons/:id
// @access  Private (Instructor, Owner)
const deleteCoupon = asyncHandler(async (req, res) => {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
        res.status(404);
        throw new Error('Coupon not found');
    }

    if (coupon.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Not authorized');
    }

    await coupon.deleteOne();

    res.status(200).json({ id: req.params.id });
});

// @desc    Validate a coupon code (public check)
// @route   POST /api/coupons/validate
// @access  Private
const validateCoupon = asyncHandler(async (req, res) => {
    const { code, courseId } = req.body;

    if (!code || !courseId) {
        res.status(400);
        throw new Error('Please provide coupon code and course ID');
    }

    const coupon = await Coupon.findOne({
        code: code.toUpperCase(),
        course: courseId
    });

    if (!coupon) {
        res.status(404);
        throw new Error('Invalid coupon code');
    }

    const validity = coupon.isValid();

    if (!validity.valid) {
        res.status(400);
        throw new Error(validity.reason);
    }

    // Get course price to calculate discount
    const course = await Course.findById(courseId);
    const discountAmount = coupon.calculateDiscount(course.price);
    const finalPrice = course.price - discountAmount;

    res.status(200).json({
        valid: true,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        originalPrice: course.price,
        finalPrice: Math.max(finalPrice, 0)
    });
});

module.exports = {
    createCoupon,
    getCourseCoupons,
    updateCoupon,
    deleteCoupon,
    validateCoupon
};
