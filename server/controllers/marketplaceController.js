const asyncHandler = require('express-async-handler');
const Course = require('../models/Course');
const User = require('../models/User');
const Review = require('../models/Review');
const { getPaging, escapeRegex } = require('../utils/query');
const { getCategoryNames } = require('./categoryController');

// @desc    Get all marketplace courses
// @route   GET /api/marketplace
// @access  Public
const getMarketplaceCourses = asyncHandler(async (req, res) => {
    const {
        category,
        level,
        language,
        minPrice,
        maxPrice,
        minRating,
        sortBy = 'newest'
    } = req.query;
    const { page, limit, skip } = getPaging(req.query, 12);

    // Build filter query
    const filter = {
        isMarketplace: true,
        status: 'Published',
        isAdminBlocked: { $ne: true }
    };

    if (category) filter.category = category;
    if (level) filter.level = level;
    if (language) filter.language = language;
    if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = Number(minPrice);
        if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (minRating) filter['rating.average'] = { $gte: Number(minRating) };

    // Sort options
    let sort = {};
    switch (sortBy) {
        case 'newest':
            sort = { createdAt: -1 };
            break;
        case 'popular':
            sort = { enrollmentCount: -1 };
            break;
        case 'rating':
            sort = { 'rating.average': -1 };
            break;
        case 'price-low':
            sort = { price: 1 };
            break;
        case 'price-high':
            sort = { price: -1 };
            break;
        default:
            sort = { createdAt: -1 };
    }

    const courses = await Course.find(filter)
        .populate('user', 'name profileImage')
        .select('title description thumbnail price originalPrice currency category level language rating enrollmentCount user createdAt tags')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit));

    const total = await Course.countDocuments(filter);

    res.status(200).json({
        courses,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
        }
    });
});

// @desc    Get single marketplace course (public landing page)
// @route   GET /api/marketplace/:id
// @access  Public
const getMarketplaceCourse = asyncHandler(async (req, res) => {
    const course = await Course.findOne({
        _id: req.params.id,
        isMarketplace: true,
        status: 'Published',
        isAdminBlocked: { $ne: true }
    })
        .populate('user', 'name bio profileImage')
        .populate({
            path: 'sections.lectures',
            model: 'Lecture',
            select: 'title number description isPublic isPreview'
        });

    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    // Get reviews for this course
    const reviews = await Review.find({ course: course._id })
        .populate('user', 'name profileImage')
        .sort({ createdAt: -1 })
        .limit(10);

    // Count total lectures
    let totalLectures = 0;
    course.sections.forEach(section => {
        totalLectures += section.lectures.length;
    });

    // Prepare response - this page is public, so internal settings are left out
    const {
        aiBlockedStudents, notificationSettings, adminBlockReason, isAdminBlocked, allowStudentBroadcasts,
        allowPeerProgress, allowStudentUploads, allowStudentAI, lectureStatuses, completedStatus,
        ...courseData
    } = course.toObject();

    // Filter out hidden sections
    courseData.sections = courseData.sections
        .filter(section => section.isPublic)
        .map(section => ({
            ...section,
            lectures: section.lectures.filter(lecture => lecture.isPublic || lecture.isPreview).map(lecture => ({
                _id: lecture._id,
                title: lecture.title,
                number: lecture.number,
                isPublic: lecture.isPublic,
                isPreview: lecture.isPreview,
                // Only include description if public or preview
                ...(lecture.isPublic || lecture.isPreview ? { description: lecture.description } : {})
            }))
        }));

    res.status(200).json({
        course: courseData,
        reviews,
        totalLectures,
        instructor: course.user
    });
});

// @desc    Search marketplace courses
// @route   GET /api/marketplace/search
// @access  Public
const searchMarketplace = asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? '');
    const { page, limit, skip } = getPaging(req.query, 12);

    if (!q || q.trim().length === 0) {
        res.status(400);
        throw new Error('Search query is required');
    }

    const searchRegex = new RegExp(escapeRegex(q.trim()), 'i');

    const instructors = await User.find({ name: searchRegex, role: { $in: ['instructor', 'admin'] } }).select('_id').limit(50).lean();

    const filter = {
        isMarketplace: true,
        status: 'Published',
        isAdminBlocked: { $ne: true },
        $or: [
            { title: searchRegex },
            { description: searchRegex },
            { category: searchRegex },
            { tags: searchRegex },
            { user: { $in: instructors.map(i => i._id) } }
        ]
    };

    const courses = await Course.find(filter)
        .populate('user', 'name profileImage')
        .select('title description thumbnail price originalPrice currency category level language rating enrollmentCount user createdAt tags')
        .sort({ 'rating.average': -1, enrollmentCount: -1 })
        .skip(skip)
        .limit(Number(limit));

    const total = await Course.countDocuments(filter);

    res.status(200).json({
        courses,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
        },
        query: q
    });
});

// @desc    Get all categories
// @route   GET /api/marketplace/categories
// @access  Public
const getCategories = asyncHandler(async (req, res) => {
    res.status(200).json(await getCategoryNames());
});

module.exports = {
    getMarketplaceCourses,
    getMarketplaceCourse,
    searchMarketplace,
    getCategories
};
