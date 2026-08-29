const asyncHandler = require('express-async-handler');
const Notification = require('../models/Notification');
const Progress = require('../models/Progress');

// Helper: Create notifications for all enrolled students of a course
const notifyCourseStudents = async (courseId, { title, message, type, link, priority }) => {
    try {
        const progresses = await Progress.find({ course: courseId }).select('student');
        if (!progresses.length) return;

        const notifications = progresses.map(p => ({
            user: p.student,
            course: courseId,
            title,
            message: message || '',
            type,
            link: link || '',
            priority: priority || 'normal'
        }));

        await Notification.insertMany(notifications);
    } catch (err) {
        console.error('Failed to create notifications:', err.message);
    }
};

// Helper: Create notification for a single user
const notifyUser = async (userId, { courseId, title, message, type, link, priority }) => {
    try {
        await Notification.create({
            user: userId,
            course: courseId,
            title,
            message: message || '',
            type,
            link: link || '',
            priority: priority || 'normal'
        });
    } catch (err) {
        console.error('Failed to create notification:', err.message);
    }
};

// @desc    Get notifications for current user
// @route   GET /api/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const total = await Notification.countDocuments({ user: userId });
    const notifications = await Notification.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate('course', 'title');

    res.json({
        notifications,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadCount = asyncHandler(async (req, res) => {
    const count = await Notification.countDocuments({ user: req.user._id, read: false });
    res.json({ count });
});

// @desc    Mark a single notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        { read: true },
        { new: true }
    );
    if (!notification) {
        res.status(404);
        throw new Error('Notification not found');
    }
    res.json(notification);
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/mark-all-read
// @access  Private
const markAllAsRead = asyncHandler(async (req, res) => {
    await Notification.updateMany(
        { user: req.user._id, read: false },
        { read: true }
    );
    res.json({ message: 'All notifications marked as read' });
});

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = asyncHandler(async (req, res) => {
    const notification = await Notification.findOneAndDelete({
        _id: req.params.id,
        user: req.user._id
    });
    if (!notification) {
        res.status(404);
        throw new Error('Notification not found');
    }
    res.json({ message: 'Notification deleted' });
});

// @desc    Send custom notification to course students (instructor)
// @route   POST /api/notifications/course/:courseId/send
// @access  Instructor only
const sendCustomNotification = asyncHandler(async (req, res) => {
    const { title, message, priority, studentIds } = req.body;
    if (!title) {
        res.status(400);
        throw new Error('Title is required');
    }

    if (studentIds && studentIds.length > 0) {
        // Send to specific students
        for (const studentId of studentIds) {
            await notifyUser(studentId, {
                courseId: req.params.courseId,
                title,
                message,
                type: 'custom',
                priority: priority || 'normal'
            });
        }
        res.json({ message: `Notification sent to ${studentIds.length} student(s)` });
    } else {
        // Send to all enrolled students
        await notifyCourseStudents(req.params.courseId, {
            title,
            message,
            type: 'custom',
            priority: priority || 'normal'
        });
        res.json({ message: 'Notification sent to all enrolled students' });
    }
});

// @desc    Update notification settings for a course
// @route   PUT /api/notifications/course/:courseId/settings
// @access  Instructor only
const updateNotificationSettings = asyncHandler(async (req, res) => {
    const Course = require('../models/Course');
    const course = await Course.findById(req.params.courseId);
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    const allowed = ['newContent', 'newBroadcast', 'newQuiz', 'dueDateReminder', 'aiAccessChange', 'progressMilestone'];
    const settings = course.notificationSettings || {};
    for (const key of allowed) {
        if (req.body[key] !== undefined) {
            settings[key] = Boolean(req.body[key]);
        }
    }
    course.notificationSettings = settings;
    await course.save();

    res.json({ notificationSettings: course.notificationSettings });
});

module.exports = {
    notifyCourseStudents,
    notifyUser,
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    sendCustomNotification,
    updateNotificationSettings
};
