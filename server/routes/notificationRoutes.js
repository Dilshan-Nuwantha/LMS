const express = require('express');
const router = express.Router();
const { protect, instructorOnly } = require('../middleware/authMiddleware');
const {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    sendCustomNotification,
    updateNotificationSettings
} = require('../controllers/notificationController');

router.use(protect);

// User notifications
router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/mark-all-read', markAllAsRead);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

// Instructor: send custom notification & manage settings
router.post('/course/:courseId/send', instructorOnly, sendCustomNotification);
router.put('/course/:courseId/settings', instructorOnly, updateNotificationSettings);

module.exports = router;
