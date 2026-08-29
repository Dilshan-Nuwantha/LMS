const express = require('express');
const router = express.Router();
const {
    createBroadcast,
    getCourseBroadcasts,
    getActiveBroadcasts,
    updateBroadcast,
    deleteBroadcast,
    checkBroadcastPermission,
    toggleStudentBroadcasts,
    markBroadcastsAsRead,
    getUnreadCount
} = require('../controllers/broadcastController');
const { protect } = require('../middleware/authMiddleware');
const { verifyCourseOwnership, verifyBroadcastPermission, verifyBroadcastOwnership } = require('../middleware/ownershipMiddleware');

// Student route - get active broadcasts for enrolled course
router.get('/course/:courseId/active', protect, getActiveBroadcasts);

// Check if user can broadcast
router.get('/course/:courseId/can-broadcast', protect, checkBroadcastPermission);

// Unread count and mark as read
router.get('/course/:courseId/unread-count', protect, getUnreadCount);
router.post('/course/:courseId/mark-read', protect, markBroadcastsAsRead);

// Toggle student broadcast permission (admin or course owner only)
router.put('/course/:courseId/settings', protect, verifyCourseOwnership, toggleStudentBroadcasts);

// Broadcaster routes (admin, owner, or students if allowed)
router.post('/course/:courseId', protect, verifyBroadcastPermission, createBroadcast);
router.get('/course/:courseId', protect, verifyBroadcastPermission, getCourseBroadcasts);

// Broadcast owner routes (admin, course owner, or broadcast creator)
router.put('/:id', protect, verifyBroadcastOwnership, updateBroadcast);
router.delete('/:id', protect, verifyBroadcastOwnership, deleteBroadcast);

module.exports = router;
