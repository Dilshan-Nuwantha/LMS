const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Course = require('../models/Course');
const Purchase = require('../models/Purchase');
const Lecture = require('../models/Lecture');
const BankDetail = require('../models/BankDetail');
const Payout = require('../models/Payout');

// @desc    Become an instructor (upgrade from student)
// @route   POST /api/instructor/become
// @access  Private
const becomeInstructor = asyncHandler(async (req, res) => {
    const { bio } = req.body;

    if (req.user.role === 'instructor') {
        res.status(400);
        throw new Error('You are already an instructor');
    }

    if (req.user.role === 'admin') {
        res.status(400);
        throw new Error('Admins cannot become instructors');
    }

    const user = await User.findByIdAndUpdate(
        req.user.id,
        {
            role: 'instructor',
            bio: bio || ''
        },
        { new: true }
    ).select('-password');

    res.status(200).json({
        message: 'You are now an instructor!',
        user
    });
});

// @desc    Get instructor dashboard stats
// @route   GET /api/instructor/dashboard
// @access  Private (Instructor)
const getInstructorDashboard = asyncHandler(async (req, res) => {
    const instructorId = req.user.id;

    // Get all marketplace courses by instructor
    const courses = await Course.find({
        user: instructorId,
        isMarketplace: true
    }).select('title enrollmentCount rating price status');

    // Get total revenue
    const revenueResult = await Purchase.aggregate([
        {
            $match: {
                instructor: instructorId,
                status: 'completed'
            }
        },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: '$amount' },
                totalSales: { $sum: 1 }
            }
        }
    ]);

    const revenue = revenueResult[0] || { totalRevenue: 0, totalSales: 0 };

    // Get recent purchases
    const recentPurchases = await Purchase.find({
        instructor: instructorId,
        status: 'completed'
    })
        .populate('user', 'name email')
        .populate('course', 'title')
        .sort({ purchasedAt: -1 })
        .limit(10);

    // Calculate total students (unique)
    const uniqueStudents = await Purchase.distinct('user', {
        instructor: instructorId,
        status: 'completed'
    });

    res.status(200).json({
        courses,
        totalCourses: courses.length,
        totalRevenue: revenue.totalRevenue,
        totalSales: revenue.totalSales,
        totalStudents: uniqueStudents.length,
        recentPurchases
    });
});

// @desc    Get instructor's marketplace courses
// @route   GET /api/instructor/courses
// @access  Private (Instructor)
const getInstructorCourses = asyncHandler(async (req, res) => {
    const courses = await Course.find({
        user: req.user.id,
        isMarketplace: true
    }).sort({ createdAt: -1 });

    res.status(200).json(courses);
});

// @desc    Create a marketplace course
// @route   POST /api/instructor/course
// @access  Private (Instructor)
const createMarketplaceCourse = asyncHandler(async (req, res) => {
    const {
        title,
        description,
        price,
        originalPrice,
        currency,
        thumbnail,
        previewVideo,
        category,
        level,
        requirements,
        whatYouWillLearn,
        language
    } = req.body;

    if (!title || !description || price === undefined) {
        res.status(400);
        throw new Error('Please provide title, description, and price');
    }

    const course = await Course.create({
        title,
        description,
        price,
        originalPrice: originalPrice || price,
        currency: currency || 'INR',
        thumbnail: thumbnail || '',
        previewVideo: previewVideo || '',
        category: category || '',
        level: level || '',
        requirements: requirements || [],
        whatYouWillLearn: whatYouWillLearn || [],
        language: language || 'English',
        isMarketplace: true,
        status: 'Draft',
        user: req.user.id,
        lectureStatuses: [
            { label: 'Not Started', color: '#64748b' },
            { label: 'In Progress', color: '#f59e0b' },
            { label: 'Completed', color: '#10b981' }
        ],
        completedStatus: 'Completed'
    });

    res.status(201).json(course);
});

// @desc    Update a marketplace course
// @route   PUT /api/instructor/course/:id
// @access  Private (Instructor, Owner)
const updateMarketplaceCourse = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id);

    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    if (course.user.toString() !== req.user.id && req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Not authorized to update this course');
    }

    const {
        title,
        description,
        price,
        originalPrice,
        currency,
        thumbnail,
        previewVideo,
        category,
        level,
        requirements,
        whatYouWillLearn,
        language,
        status
    } = req.body;

    // Update fields
    if (title !== undefined) course.title = title;
    if (description !== undefined) course.description = description;
    if (price !== undefined) course.price = price;
    if (originalPrice !== undefined) course.originalPrice = originalPrice;
    if (currency !== undefined) course.currency = currency;
    if (thumbnail !== undefined) course.thumbnail = thumbnail;
    if (previewVideo !== undefined) course.previewVideo = previewVideo;
    if (category !== undefined) course.category = category;
    if (level !== undefined) course.level = level;
    if (requirements !== undefined) course.requirements = requirements;
    if (whatYouWillLearn !== undefined) course.whatYouWillLearn = whatYouWillLearn;
    if (language !== undefined) course.language = language;
    if (status !== undefined) course.status = status;

    await course.save();

    res.status(200).json(course);
});

// @desc    Get instructor profile
// @route   GET /api/instructor/profile
// @access  Private (Instructor)
const getInstructorProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select('-password');

    const courseCount = await Course.countDocuments({
        user: req.user.id,
        isMarketplace: true,
        status: 'Published'
    });

    const studentCount = await Purchase.distinct('user', {
        instructor: req.user.id,
        status: 'completed'
    });

    res.status(200).json({
        ...user.toObject(),
        courseCount,
        studentCount: studentCount.length
    });
});

// @desc    Update instructor profile
// @route   PUT /api/instructor/profile
// @access  Private (Instructor)
const updateInstructorProfile = asyncHandler(async (req, res) => {
    const { bio, profileImage } = req.body;

    const user = await User.findByIdAndUpdate(
        req.user.id,
        {
            ...(bio !== undefined && { bio }),
            ...(profileImage !== undefined && { profileImage })
        },
        { new: true }
    ).select('-password');

    res.status(200).json(user);
});

// @desc    Get course sales details
// @route   GET /api/instructor/course/:id/sales
// @access  Private (Instructor, Owner)
const getCourseSales = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id);

    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    if (course.user.toString() !== req.user.id && req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Not authorized');
    }

    const purchases = await Purchase.find({
        course: req.params.id,
        status: 'completed'
    })
        .populate('user', 'name email')
        .sort({ purchasedAt: -1 });

    const totalRevenue = purchases.reduce((sum, p) => sum + p.amount, 0);

    res.status(200).json({
        course: {
            title: course.title,
            price: course.price,
            enrollmentCount: course.enrollmentCount
        },
        purchases,
        totalRevenue,
        totalSales: purchases.length
    });
});

// @desc    Get instructor bank details
// @route   GET /api/instructor/bank-details
// @access  Private (Instructor)
const getBankDetails = asyncHandler(async (req, res) => {
    const bankDetail = await BankDetail.findOne({ user: req.user.id });
    res.status(200).json(bankDetail || null);
});

// @desc    Save/update instructor bank details
// @route   POST /api/instructor/bank-details
// @access  Private (Instructor)
const saveBankDetails = asyncHandler(async (req, res) => {
    const { accountHolderName, bankName, accountNumber, ifscCode, upiId, paypalEmail, preferredMethod } = req.body;

    if (!accountHolderName) {
        res.status(400);
        throw new Error('Account holder name is required');
    }

    const bankDetail = await BankDetail.findOneAndUpdate(
        { user: req.user.id },
        {
            user: req.user.id,
            accountHolderName,
            bankName: bankName || '',
            accountNumber: accountNumber || '',
            ifscCode: ifscCode || '',
            upiId: upiId || '',
            paypalEmail: paypalEmail || '',
            preferredMethod: preferredMethod || 'bank_transfer'
        },
        { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json(bankDetail);
});

// @desc    Get instructor earnings & payout history
// @route   GET /api/instructor/earnings
// @access  Private (Instructor)
const getEarnings = asyncHandler(async (req, res) => {
    const instructorId = req.user.id;

    const [earningsResult, payoutResult, payouts, monthlyEarnings] = await Promise.all([
        Purchase.aggregate([
            { $match: { instructor: req.user._id, status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' }, sales: { $sum: 1 } } }
        ]),
        Payout.aggregate([
            { $match: { instructor: req.user._id, status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Payout.find({ instructor: instructorId })
            .populate('processedBy', 'name')
            .sort({ createdAt: -1 })
            .limit(20),
        Purchase.aggregate([
            { $match: { instructor: req.user._id, status: 'completed' } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m', date: '$purchasedAt' } },
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: -1 } },
            { $limit: 6 }
        ])
    ]);

    const earnings = earningsResult[0] || { total: 0, sales: 0 };
    const paidOut = payoutResult[0]?.total || 0;

    res.status(200).json({
        totalEarnings: earnings.total,
        totalSales: earnings.sales,
        totalPaidOut: paidOut,
        pendingAmount: earnings.total - paidOut,
        payouts,
        monthlyEarnings: monthlyEarnings.reverse()
    });
});

module.exports = {
    becomeInstructor,
    getInstructorDashboard,
    getInstructorCourses,
    createMarketplaceCourse,
    updateMarketplaceCourse,
    getInstructorProfile,
    updateInstructorProfile,
    getCourseSales,
    getBankDetails,
    saveBankDetails,
    getEarnings
};
