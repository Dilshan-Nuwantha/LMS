const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Course = require('../models/Course');
const Purchase = require('../models/Purchase');
const Payout = require('../models/Payout');
const BankDetail = require('../models/BankDetail');
const CommissionPayment = require('../models/CommissionPayment');
const Upload = require('../models/Upload');
const { CURRENCIES, getEarningsByCurrency, totalsFor, toSummary, splitClaim } = require('../services/earningsService');
const { notifyUser } = require('./notificationController');
const { getPaging } = require('../utils/query');

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
        earnings,
        recentPurchases,
        recentPayouts
    ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: 'instructor' }),
        User.countDocuments({ role: 'student' }),
        Course.countDocuments({ isMarketplace: true }),
        Course.countDocuments({ isMarketplace: true, status: 'Published' }),
        getEarningsByCurrency(),
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

    // Money fields are LKR; byCurrency has the LKR / USD split
    const summary = toSummary(totalsFor(earnings));

    res.status(200).json({
        stats: {
            totalUsers,
            totalInstructors,
            totalStudents,
            totalCourses,
            publishedCourses,
            totalRevenue: summary.totalEarnings,
            totalSales: summary.totalSales,
            totalPaidOut: summary.totalPaidOut,
            totalCommission: summary.totalCommission,
            commissionOwed: summary.commissionOwed,
            pendingPayout: summary.pendingAmount,
            byCurrency: summary.byCurrency
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

    // Run bulk queries instead of N individual ones
    const [earningsByInstructor, coursesByInstructor, bankDetails] = await Promise.all([
        getEarningsByCurrency({ instructor: { $in: instructorIds } }, '$instructor'),
        Course.aggregate([
            { $match: { user: { $in: instructorIds }, isMarketplace: true } },
            { $group: { _id: '$user', count: { $sum: 1 } } }
        ]),
        BankDetail.find({ user: { $in: instructorIds } }).select('user preferredMethod').lean()
    ]);

    // Index results by instructor ID for O(1) lookup
    const coursesMap = Object.fromEntries(coursesByInstructor.map(c => [c._id.toString(), c.count]));
    const bankMap = Object.fromEntries(bankDetails.map(b => [b.user.toString(), b]));

    const instructorData = instructors.map(instructor => {
        const id = instructor._id.toString();
        const bank = bankMap[id];

        return {
            ...instructor.toObject(),
            ...toSummary(totalsFor(earningsByInstructor, id)),
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

    const [bankDetail, earnings, courses, payouts] = await Promise.all([
        BankDetail.findOne({ user: instructor._id }),
        getEarningsByCurrency({ instructor: instructor._id }),
        Course.find({ user: instructor._id, isMarketplace: true }).select('title price enrollmentCount status'),
        Payout.find({ instructor: instructor._id })
            .populate('processedBy', 'name')
            .sort({ createdAt: -1 })
            .limit(20)
    ]);

    res.status(200).json({
        instructor: instructor.toObject(),
        bankDetail,
        ...toSummary(totalsFor(earnings)),
        courses,
        payouts
    });
});

// @desc    Create a payout for instructor
// @route   POST /api/admin/payouts
// @access  Private (Admin)
const createPayout = asyncHandler(async (req, res) => {
    const { instructorId, amount, method, transactionId, note, currency = 'LKR' } = req.body;

    if (!instructorId || !amount || !method) {
        res.status(400);
        throw new Error('Please provide instructor, amount, and method');
    }

    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
        res.status(400);
        throw new Error('Payout amount must be a positive number');
    }

    if (!CURRENCIES.includes(currency)) {
        res.status(400);
        throw new Error(`Currency must be one of ${CURRENCIES.join(', ')}`);
    }

    const instructor = await User.findById(instructorId);
    if (!instructor || instructor.role !== 'instructor') {
        res.status(404);
        throw new Error('Instructor not found');
    }

    // Verify amount doesn't exceed what can still be paid in that currency
    const earnings = await getEarningsByCurrency({ instructor: instructor._id });
    const { available } = totalsFor(earnings)[currency];

    if (amount > available) {
        res.status(400);
        throw new Error(`Amount exceeds the available balance of ${currency} ${available}`);
    }

    const { grossAmount, commissionAmount, netAmount } = splitClaim(Number(amount));

    const payout = await Payout.create({
        instructor: instructorId,
        amount: netAmount,
        grossAmount,
        commissionAmount,
        currency,
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

// @desc    Approve a claim once the money has been sent
// @route   PUT /api/admin/payouts/:id/approve
// @access  Private (Admin)
const approvePayout = asyncHandler(async (req, res) => {
    const { transactionId, note } = req.body;

    if (typeof transactionId !== 'string' || !transactionId.trim()) {
        res.status(400);
        throw new Error('Please add the transaction reference');
    }

    const payout = await Payout.findOneAndUpdate(
        { _id: req.params.id, status: 'pending' },
        {
            status: 'completed',
            transactionId: transactionId.trim(),
            ...(typeof note === 'string' && { note }),
            processedBy: req.user.id,
            processedAt: new Date()
        },
        { new: true }
    );

    if (!payout) {
        res.status(404);
        throw new Error('No claim is waiting with this id');
    }

    await notifyUser(payout.instructor, {
        title: 'Claim paid',
        message: `Your claim was paid. Reference: ${payout.transactionId}`,
        type: 'payment',
        link: '/instructor/dashboard'
    });

    res.status(200).json(payout);
});

// @desc    Reject a claim, which frees the amount to be claimed again
// @route   PUT /api/admin/payouts/:id/reject
// @access  Private (Admin)
const rejectPayout = asyncHandler(async (req, res) => {
    const note = typeof req.body.note === 'string' ? req.body.note.trim().slice(0, 300) : '';

    const payout = await Payout.findOneAndUpdate(
        { _id: req.params.id, status: 'pending' },
        { status: 'failed', note, processedBy: req.user.id, processedAt: new Date() },
        { new: true }
    );

    if (!payout) {
        res.status(404);
        throw new Error('No claim is waiting with this id');
    }

    await notifyUser(payout.instructor, {
        title: 'Claim rejected',
        message: note || 'Your claim was not accepted. You can send a new one.',
        type: 'payment',
        link: '/instructor/dashboard'
    });

    res.status(200).json(payout);
});

// @desc    List commission payments from instructors
// @route   GET /api/admin/commission-payments
// @access  Private (Admin)
const getCommissionPayments = asyncHandler(async (req, res) => {
    const filter = ['pending', 'approved', 'rejected'].includes(req.query.status) ? { status: req.query.status } : {};

    res.status(200).json(await CommissionPayment.find(filter)
        .populate('instructor', 'name email')
        .sort({ createdAt: -1 })
        .limit(100));
});

// @desc    See the proof of a commission payment
// @route   GET /api/admin/commission-payments/:id/proof
// @access  Private (Admin)
const getCommissionProof = asyncHandler(async (req, res) => {
    const payment = await CommissionPayment.findById(req.params.id);
    const proof = payment && await Upload.findOne({ _id: payment.proof, kind: 'slip' });

    if (!proof) {
        res.status(404);
        throw new Error('Proof not found');
    }

    res.set({ 'Content-Type': proof.mimeType, 'Content-Length': proof.size, 'Cache-Control': 'private, no-store' });
    res.send(proof.data);
});

// @desc    Approve or reject a commission payment
// @route   PUT /api/admin/commission-payments/:id/approve, /reject
// @access  Private (Admin)
const reviewCommission = (status) => asyncHandler(async (req, res) => {
    const note = typeof req.body.note === 'string' ? req.body.note.trim().slice(0, 300) : '';

    const payment = await CommissionPayment.findOneAndUpdate(
        { _id: req.params.id, status: 'pending' },
        { status, note, reviewedBy: req.user.id, reviewedAt: new Date() },
        { new: true }
    );

    if (!payment) {
        res.status(404);
        throw new Error('No commission payment is waiting with this id');
    }

    await notifyUser(payment.instructor, {
        title: status === 'approved' ? 'Commission payment approved' : 'Commission payment rejected',
        message: note || `Your payment of ${payment.amount} ${payment.currency} was ${status}.`,
        type: 'payment',
        link: '/instructor/dashboard'
    });

    res.status(200).json(payment);
});

// @desc    List users waiting to become instructors
// @route   GET /api/admin/instructor-requests
// @access  Private (Admin)
const getInstructorRequests = asyncHandler(async (req, res) => {
    res.status(200).json(await User.find({ 'instructorRequest.status': 'pending' })
        .select('name email bio instructorRequest')
        .sort({ 'instructorRequest.requestedAt': 1 }));
});

// @desc    Approve or reject an instructor request
// @route   PUT /api/admin/instructor-requests/:id/approve, /reject
// @access  Private (Admin)
const reviewInstructorRequest = (approved) => asyncHandler(async (req, res) => {
    const note = typeof req.body.note === 'string' ? req.body.note.trim().slice(0, 300) : '';

    const user = await User.findOneAndUpdate(
        { _id: req.params.id, 'instructorRequest.status': 'pending' },
        approved
            ? { role: 'instructor', 'instructorRequest.status': 'approved', 'instructorRequest.note': '' }
            : { 'instructorRequest.status': 'rejected', 'instructorRequest.note': note },
        { new: true }
    ).select('name email role instructorRequest');

    if (!user) {
        res.status(404);
        throw new Error('No request is waiting for this user');
    }

    await notifyUser(user._id, {
        title: approved ? 'You are now an instructor' : 'Instructor request rejected',
        message: approved ? 'You can now create courses in the Instructor Center.' : note || 'Your request was not accepted. You can ask again.',
        type: 'custom',
        link: approved ? '/instructor/dashboard' : '/become-instructor'
    });

    res.status(200).json(user);
});

// @desc    Get all payouts
// @route   GET /api/admin/payouts
// @access  Private (Admin)
const getPayouts = asyncHandler(async (req, res) => {
    const { instructorId, status } = req.query;
    const { page, limit } = getPaging(req.query, 20);
    const query = {};
    if (instructorId) query.instructor = instructorId;
    if (['pending', 'completed', 'failed'].includes(status)) query.status = status;

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

    const index = Number(req.params.index);
    if (!Number.isInteger(index) || index < 0 || index >= user.warnings.length) { res.status(400); throw new Error('Invalid warning index'); }

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
    if (req.params.id === req.user.id) { res.status(400); throw new Error('You cannot block your own account'); }

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
    if (user.role === 'admin') { res.status(403); throw new Error('Admin roles cannot be changed here'); }

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

    if (user.role === 'admin') {
        res.status(403);
        throw new Error('Admin accounts cannot be impersonated');
    }

    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: user._id, v: user.tokenVersion || 0, imp: req.user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

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
    getCommissionPayments,
    getCommissionProof,
    approveCommission: reviewCommission('approved'),
    rejectCommission: reviewCommission('rejected'),
    getInstructorRequests,
    approveInstructorRequest: reviewInstructorRequest(true),
    rejectInstructorRequest: reviewInstructorRequest(false),
    createPayout,
    approvePayout,
    rejectPayout,
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
