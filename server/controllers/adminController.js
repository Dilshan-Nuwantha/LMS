const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Course = require('../models/Course');
const Purchase = require('../models/Purchase');
const Payout = require('../models/Payout');
const BankDetail = require('../models/BankDetail');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
const getAdminDashboard = asyncHandler(async (req, res) => {
    const [
        totalUsers,
        totalInstructors,
        totalStudents,
        totalCourses,
        publishedCourses,
        revenueResult,
        totalPayoutsResult,
        recentPurchases,
        recentPayouts
    ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: 'instructor' }),
        User.countDocuments({ role: 'student' }),
        Course.countDocuments({ isMarketplace: true }),
        Course.countDocuments({ isMarketplace: true, status: 'Published' }),
        Purchase.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]),
        Payout.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Purchase.find({ status: 'completed' })
            .populate('user', 'name email')
            .populate('course', 'title')
            .populate('instructor', 'name')
            .sort({ purchasedAt: -1 })
            .limit(10),
        Payout.find()
            .populate('instructor', 'name email')
            .populate('processedBy', 'name')
            .sort({ createdAt: -1 })
            .limit(5)
    ]);

    const revenue = revenueResult[0] || { total: 0, count: 0 };
    const totalPaidOut = totalPayoutsResult[0]?.total || 0;

    res.status(200).json({
        stats: {
            totalUsers,
            totalInstructors,
            totalStudents,
            totalCourses,
            publishedCourses,
            totalRevenue: revenue.total,
            totalSales: revenue.count,
            totalPaidOut,
            pendingPayout: revenue.total - totalPaidOut
        },
        recentPurchases,
        recentPayouts
    });
});

// @desc    Get all instructors with their earnings
// @route   GET /api/admin/instructors
// @access  Private (Admin)
const getInstructors = asyncHandler(async (req, res) => {
    const instructors = await User.find({ role: 'instructor' })
        .select('name email bio profileImage createdAt')
        .sort({ createdAt: -1 });

    const instructorIds = instructors.map(i => i._id);

    // Run 4 bulk queries instead of 4 * N individual ones
    const [earningsByInstructor, payoutsByInstructor, coursesByInstructor, bankDetails] = await Promise.all([
        Purchase.aggregate([
            { $match: { instructor: { $in: instructorIds }, status: 'completed' } },
            { $group: { _id: '$instructor', total: { $sum: '$amount' }, sales: { $sum: 1 } } }
        ]),
        Payout.aggregate([
            { $match: { instructor: { $in: instructorIds }, status: 'completed' } },
            { $group: { _id: '$instructor', total: { $sum: '$amount' } } }
        ]),
        Course.aggregate([
            { $match: { user: { $in: instructorIds }, isMarketplace: true } },
            { $group: { _id: '$user', count: { $sum: 1 } } }
        ]),
        BankDetail.find({ user: { $in: instructorIds } }).select('user preferredMethod').lean()
    ]);

    // Index results by instructor ID for O(1) lookup
    const earningsMap = Object.fromEntries(earningsByInstructor.map(e => [e._id.toString(), e]));
    const payoutsMap = Object.fromEntries(payoutsByInstructor.map(p => [p._id.toString(), p]));
    const coursesMap = Object.fromEntries(coursesByInstructor.map(c => [c._id.toString(), c.count]));
    const bankMap = Object.fromEntries(bankDetails.map(b => [b.user.toString(), b]));

    const instructorData = instructors.map(instructor => {
        const id = instructor._id.toString();
        const earnings = earningsMap[id] || { total: 0, sales: 0 };
        const paidOut = payoutsMap[id]?.total || 0;
        const bank = bankMap[id];

        return {
            ...instructor.toObject(),
            totalEarnings: earnings.total,
            totalSales: earnings.sales,
            totalPaidOut: paidOut,
            pendingAmount: earnings.total - paidOut,
            courseCount: coursesMap[id] || 0,
            hasBankDetails: !!bank,
            preferredMethod: bank?.preferredMethod || null
        };
    });

    res.status(200).json(instructorData);
});

// @desc    Get instructor detail with bank info (admin view)
// @route   GET /api/admin/instructors/:id
// @access  Private (Admin)
const getInstructorDetail = asyncHandler(async (req, res) => {
    const instructor = await User.findById(req.params.id).select('-password');
    if (!instructor || instructor.role !== 'instructor') {
        res.status(404);
        throw new Error('Instructor not found');
    }

    const [bankDetail, earningsResult, payoutResult, courses, payouts] = await Promise.all([
        BankDetail.findOne({ user: instructor._id }),
        Purchase.aggregate([
            { $match: { instructor: instructor._id, status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' }, sales: { $sum: 1 } } }
        ]),
        Payout.aggregate([
            { $match: { instructor: instructor._id, status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Course.find({ user: instructor._id, isMarketplace: true }).select('title price enrollmentCount status'),
        Payout.find({ instructor: instructor._id })
            .populate('processedBy', 'name')
            .sort({ createdAt: -1 })
            .limit(20)
    ]);

    const earnings = earningsResult[0] || { total: 0, sales: 0 };
    const paidOut = payoutResult[0]?.total || 0;

    res.status(200).json({
        instructor: instructor.toObject(),
        bankDetail,
        totalEarnings: earnings.total,
        totalSales: earnings.sales,
        totalPaidOut: paidOut,
        pendingAmount: earnings.total - paidOut,
        courses,
        payouts
    });
});

// @desc    Create a payout for instructor
// @route   POST /api/admin/payouts
// @access  Private (Admin)
const createPayout = asyncHandler(async (req, res) => {
    const { instructorId, amount, method, transactionId, note } = req.body;

    if (!instructorId || !amount || !method) {
        res.status(400);
        throw new Error('Please provide instructor, amount, and method');
    }

    const instructor = await User.findById(instructorId);
    if (!instructor || instructor.role !== 'instructor') {
        res.status(404);
        throw new Error('Instructor not found');
    }

    // Verify amount doesn't exceed pending
    const [earningsResult, payoutResult] = await Promise.all([
        Purchase.aggregate([
            { $match: { instructor: instructor._id, status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Payout.aggregate([
            { $match: { instructor: instructor._id, status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
    ]);

    const totalEarnings = earningsResult[0]?.total || 0;
    const totalPaid = payoutResult[0]?.total || 0;
    const pending = totalEarnings - totalPaid;

    if (amount > pending) {
        res.status(400);
        throw new Error(`Amount exceeds pending balance of ₹${pending}`);
    }

    const payout = await Payout.create({
        instructor: instructorId,
        amount,
        method,
        transactionId: transactionId || '',
        note: note || '',
        status: 'completed',
        processedBy: req.user.id,
        processedAt: new Date()
    });

    await payout.populate('instructor', 'name email');
    await payout.populate('processedBy', 'name');

    res.status(201).json(payout);
});

// @desc    Get all payouts
// @route   GET /api/admin/payouts
// @access  Private (Admin)
const getPayouts = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, instructorId } = req.query;
    const query = {};
    if (instructorId) query.instructor = instructorId;

    const [payouts, total] = await Promise.all([
        Payout.find(query)
            .populate('instructor', 'name email')
            .populate('processedBy', 'name')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit)),
        Payout.countDocuments(query)
    ]);

    res.status(200).json({
        payouts,
        total,
        pages: Math.ceil(total / limit),
        page: Number(page)
    });
});

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find({ role: { $ne: 'admin' } })
        .select('-password')
        .sort({ createdAt: -1 });
    res.status(200).json(users);
});

// @desc    Warn a user
// @route   POST /api/admin/users/:id/warn
// @access  Private (Admin)
const warnUser = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    if (!reason) { res.status(400); throw new Error('Warning reason is required'); }

    const user = await User.findById(req.params.id);
    if (!user) { res.status(404); throw new Error('User not found'); }

    user.warnings.push({ reason, issuedBy: req.user.id });

    if (user.warnings.length >= user.maxWarnings && !user.isBlocked) {
        user.isBlocked = true;
        user.blockReason = 'Maximum warnings reached. Account has been blocked.';
        user.blockedAt = new Date();
        user.blockedBy = req.user.id;
    }

    await user.save();
    const updated = await User.findById(user._id).select('-password').populate('warnings.issuedBy', 'name');
    res.status(200).json(updated);
});

// @desc    Remove a warning from a user
// @route   DELETE /api/admin/users/:id/warnings/:index
// @access  Private (Admin)
const removeWarning = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) { res.status(404); throw new Error('User not found'); }

    const index = parseInt(req.params.index);
    if (index < 0 || index >= user.warnings.length) { res.status(400); throw new Error('Invalid warning index'); }

    user.warnings.splice(index, 1);

    // If user was auto-blocked due to warnings and count is now below limit, unblock
    if (user.isBlocked && user.blockReason === 'Maximum warnings reached. Account has been blocked.' && user.warnings.length < user.maxWarnings) {
        user.isBlocked = false;
        user.blockReason = '';
        user.blockedAt = null;
        user.blockedBy = null;
    }

    await user.save();
    const updated = await User.findById(user._id).select('-password').populate('warnings.issuedBy', 'name');
    res.status(200).json(updated);
});

// @desc    Set max warnings for a user
// @route   POST /api/admin/users/:id/max-warnings
// @access  Private (Admin)
const setMaxWarnings = asyncHandler(async (req, res) => {
    const { maxWarnings } = req.body;
    if (!maxWarnings || maxWarnings < 1) { res.status(400); throw new Error('maxWarnings must be at least 1'); }

    const user = await User.findById(req.params.id);
    if (!user) { res.status(404); throw new Error('User not found'); }

    user.maxWarnings = maxWarnings;
    await user.save();
    res.status(200).json({ maxWarnings: user.maxWarnings });
});

// @desc    Block a user
// @route   POST /api/admin/users/:id/block
// @access  Private (Admin)
const blockUser = asyncHandler(async (req, res) => {
    const { reason, hideCourses } = req.body;
    if (!reason) { res.status(400); throw new Error('Block reason is required'); }

    const user = await User.findById(req.params.id);
    if (!user) { res.status(404); throw new Error('User not found'); }

    user.isBlocked = true;
    user.blockReason = reason;
    user.blockedAt = new Date();
    user.blockedBy = req.user.id;
    await user.save();

    if (hideCourses) {
        await Course.updateMany({ user: user._id }, { isAdminBlocked: true, adminBlockReason: `Instructor account blocked: ${reason}` });
    }

    const updated = await User.findById(user._id).select('-password');
    res.status(200).json(updated);
});

// @desc    Unblock a user
// @route   POST /api/admin/users/:id/unblock
// @access  Private (Admin)
const unblockUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) { res.status(404); throw new Error('User not found'); }

    user.isBlocked = false;
    user.blockReason = '';
    user.blockedAt = null;
    user.blockedBy = null;
    await user.save();

    // Restore courses that were hidden due to this user ban
    await Course.updateMany(
        { user: user._id, adminBlockReason: { $regex: /^Instructor account blocked:/ } },
        { isAdminBlocked: false, adminBlockReason: '' }
    );

    const updated = await User.findById(user._id).select('-password');
    res.status(200).json(updated);
});

// @desc    Change user role
// @route   POST /api/admin/users/:id/role
// @access  Private (Admin)
const changeUserRole = asyncHandler(async (req, res) => {
    const { role } = req.body;
    if (!['student', 'instructor'].includes(role)) { res.status(400); throw new Error('Role must be student or instructor'); }

    const user = await User.findById(req.params.id);
    if (!user) { res.status(404); throw new Error('User not found'); }

    user.role = role;
    await user.save();

    const updated = await User.findById(user._id).select('-password');
    res.status(200).json(updated);
});

// @desc    Block a course
// @route   POST /api/admin/courses/:id/block
// @access  Private (Admin)
const blockCourse = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    if (!reason) { res.status(400); throw new Error('Block reason is required'); }

    const course = await Course.findById(req.params.id);
    if (!course) { res.status(404); throw new Error('Course not found'); }

    course.isAdminBlocked = true;
    course.adminBlockReason = reason;
    await course.save();

    res.status(200).json({ _id: course._id, isAdminBlocked: true, adminBlockReason: reason });
});

// @desc    Unblock a course
// @route   POST /api/admin/courses/:id/unblock
// @access  Private (Admin)
const unblockCourse = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id);
    if (!course) { res.status(404); throw new Error('Course not found'); }

    course.isAdminBlocked = false;
    course.adminBlockReason = '';
    await course.save();

    res.status(200).json({ _id: course._id, isAdminBlocked: false });
});

// @desc    Impersonate a user (login as them)
// @route   POST /api/admin/impersonate
// @access  Private (Admin)
const impersonateUser = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        res.status(400);
        throw new Error('Email is required');
    }

    const user = await User.findOne({ email }).select('-password');
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        warnings: user.warnings || [],
        maxWarnings: user.maxWarnings || 2,
        token,
    });
});

module.exports = {
    getAdminDashboard,
    getInstructors,
    getInstructorDetail,
    createPayout,
    getPayouts,
    getAllUsers,
    warnUser,
    removeWarning,
    setMaxWarnings,
    blockUser,
    unblockUser,
    changeUserRole,
    blockCourse,
    unblockCourse,
    impersonateUser
};
