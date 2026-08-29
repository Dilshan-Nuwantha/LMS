const asyncHandler = require('express-async-handler');
const Broadcast = require('../models/Broadcast');
const Course = require('../models/Course');
const Progress = require('../models/Progress');
const BroadcastView = require('../models/BroadcastView');

// @desc    Create broadcast
// @route   POST /api/broadcasts/course/:courseId
// @access  Private (Admin, Course Owner, or Broadcaster)
const createBroadcast = asyncHandler(async (req, res) => {
    const { title, message, priority } = req.body;

    if (!title || !message) {
        res.status(400);
        throw new Error('Please add title and message');
    }

    // Course is attached by verifyBroadcastPermission middleware
    const course = req.course;

    const broadcast = await Broadcast.create({
        course: course._id,
        createdBy: req.user.id,
        title,
        message,
        priority: priority || 'normal'
    });

    // Populate createdBy for response
    await broadcast.populate('createdBy', 'name');

    // Notification trigger: new broadcast
    if (course.notificationSettings?.newBroadcast) {
        const { notifyCourseStudents } = require('./notificationController');
        notifyCourseStudents(course._id, {
            title: `Announcement: ${broadcast.title}`,
            message: broadcast.message?.substring(0, 150) || '',
            type: 'broadcast',
            link: `/course/${course._id}?tab=announcements`,
            priority: broadcast.priority || 'normal'
        });
    }

    res.status(201).json(broadcast);
});

// @desc    Get broadcasts for a course (for course owner/admin/broadcasters)
// @route   GET /api/broadcasts/course/:courseId
// @access  Private (Admin, Course Owner, or Broadcaster)
const getCourseBroadcasts = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const total = await Broadcast.countDocuments({ course: req.params.courseId });
    const broadcasts = await Broadcast.find({ course: req.params.courseId })
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    res.status(200).json({
        broadcasts,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

// @desc    Get active broadcasts for enrolled student
// @route   GET /api/broadcasts/course/:courseId/active
// @access  Private (Enrolled students)
const getActiveBroadcasts = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const query = { course: req.params.courseId, isActive: true };
    const total = await Broadcast.countDocuments(query);
    const broadcasts = await Broadcast.find(query)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    res.status(200).json({
        broadcasts,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

// @desc    Update broadcast
// @route   PUT /api/broadcasts/:id
// @access  Private (Admin, Course Owner, or Broadcast Creator)
const updateBroadcast = asyncHandler(async (req, res) => {
    // Broadcast is attached by verifyBroadcastOwnership middleware
    const broadcast = req.broadcast;

    const { title, message, priority, isActive } = req.body;

    broadcast.title = title || broadcast.title;
    broadcast.message = message || broadcast.message;
    broadcast.priority = priority || broadcast.priority;
    if (isActive !== undefined) {
        broadcast.isActive = isActive;
    }

    await broadcast.save();
    await broadcast.populate('createdBy', 'name');
    res.status(200).json(broadcast);
});

// @desc    Delete broadcast
// @route   DELETE /api/broadcasts/:id
// @access  Private (Admin, Course Owner, or Broadcast Creator)
const deleteBroadcast = asyncHandler(async (req, res) => {
    // Broadcast is attached by verifyBroadcastOwnership middleware
    const broadcast = req.broadcast;

    await broadcast.deleteOne();
    res.status(200).json({ id: req.params.id, message: 'Broadcast deleted' });
});

// @desc    Check if current user can broadcast
// @route   GET /api/broadcasts/course/:courseId/can-broadcast
// @access  Private
const checkBroadcastPermission = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.courseId);

    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    const isOwner = course.user.toString() === userId;

    // Check if user is a teacher
    const CourseTeacher = require('../models/CourseTeacher');
    const teacherRecord = await CourseTeacher.findOne({ course: course._id, teacher: userId });
    const isTeacher = !!teacherRecord;

    // Check if user is enrolled
    const isEnrolled = await Progress.exists({ student: userId, course: course._id });
    const canStudentBroadcast = course.allowStudentBroadcasts && isEnrolled;

    res.status(200).json({
        canBroadcast: isAdmin || isOwner || isTeacher || canStudentBroadcast,
        isOwner: isAdmin || isOwner,
        isTeacher,
        allowStudentBroadcasts: course.allowStudentBroadcasts
    });
});

// @desc    Mark broadcasts as read (update last viewed timestamp)
// @route   POST /api/broadcasts/course/:courseId/mark-read
// @access  Private
const markBroadcastsAsRead = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const courseId = req.params.courseId;

    // Update or create the view record with current timestamp
    await BroadcastView.findOneAndUpdate(
        { user: userId, course: courseId },
        { lastViewedAt: new Date() },
        { upsert: true, new: true }
    );

    res.status(200).json({ success: true });
});

// @desc    Get unread broadcast count for a course
// @route   GET /api/broadcasts/course/:courseId/unread-count
// @access  Private
const getUnreadCount = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const courseId = req.params.courseId;

    // Get user's last view time for this course
    const viewRecord = await BroadcastView.findOne({ user: userId, course: courseId });
    const lastViewedAt = viewRecord ? viewRecord.lastViewedAt : new Date(0); // If never viewed, use epoch

    // Count broadcasts created after the last view time (excluding user's own broadcasts)
    const unreadCount = await Broadcast.countDocuments({
        course: courseId,
        isActive: true,
        createdAt: { $gt: lastViewedAt },
        createdBy: { $ne: userId } // Don't count user's own broadcasts as unread
    });

    res.status(200).json({ unreadCount });
});

// @desc    Toggle allow student broadcasts setting
// @route   PUT /api/broadcasts/course/:courseId/settings
// @access  Private (Admin or Course Owner)
const toggleStudentBroadcasts = asyncHandler(async (req, res) => {
    // Course is attached by verifyCourseOwnership middleware
    const course = req.course;

    course.allowStudentBroadcasts = !course.allowStudentBroadcasts;
    await course.save();

    res.status(200).json({
        allowStudentBroadcasts: course.allowStudentBroadcasts
    });
});

module.exports = {
    createBroadcast,
    getCourseBroadcasts,
    getActiveBroadcasts,
    updateBroadcast,
    deleteBroadcast,
    checkBroadcastPermission,
    toggleStudentBroadcasts,
    markBroadcastsAsRead,
    getUnreadCount
};
