const express = require('express');
const router = express.Router();
const {
    getAdminDashboard,
    getInstructors,
    getInstructorDetail,
    getCommissionPayments,
    getCommissionProof,
    approveCommission,
    rejectCommission,
    getInstructorRequests,
    approveInstructorRequest,
    rejectInstructorRequest,
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
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/dashboard', protect, admin, getAdminDashboard);
router.get('/instructors', protect, admin, getInstructors);
router.get('/instructors/:id', protect, admin, getInstructorDetail);
router.get('/commission-payments', protect, admin, getCommissionPayments);
router.get('/commission-payments/:id/proof', protect, admin, getCommissionProof);
router.put('/commission-payments/:id/approve', protect, admin, approveCommission);
router.put('/commission-payments/:id/reject', protect, admin, rejectCommission);
router.get('/instructor-requests', protect, admin, getInstructorRequests);
router.put('/instructor-requests/:id/approve', protect, admin, approveInstructorRequest);
router.put('/instructor-requests/:id/reject', protect, admin, rejectInstructorRequest);
router.post('/payouts', protect, admin, createPayout);
router.put('/payouts/:id/approve', protect, admin, approvePayout);
router.put('/payouts/:id/reject', protect, admin, rejectPayout);
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
