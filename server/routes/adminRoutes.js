const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/dashboard', protect, admin, getAdminDashboard);
router.get('/instructors', protect, admin, getInstructors);
router.get('/instructors/:id', protect, admin, getInstructorDetail);
router.post('/payouts', protect, admin, createPayout);
router.get('/payouts', protect, admin, getPayouts);

// User management
router.get('/users', protect, admin, getAllUsers);
router.post('/users/:id/warn', protect, admin, warnUser);
router.delete('/users/:id/warnings/:index', protect, admin, removeWarning);
router.post('/users/:id/max-warnings', protect, admin, setMaxWarnings);
router.post('/users/:id/block', protect, admin, blockUser);
router.post('/users/:id/unblock', protect, admin, unblockUser);
router.post('/users/:id/role', protect, admin, changeUserRole);

// Course moderation
router.post('/courses/:id/block', protect, admin, blockCourse);
router.post('/courses/:id/unblock', protect, admin, unblockCourse);

// Impersonation
router.post('/impersonate', protect, admin, impersonateUser);

module.exports = router;
