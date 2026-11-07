const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
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
    getEarnings,
    createClaim,
    payCommission
} = require('../controllers/instructorController');
const { protect, instructorOnly } = require('../middleware/authMiddleware');
const { createCourseLimiter } = require('../middleware/rateLimiter');

const proofUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }
});

// Become instructor (available to students)
router.post('/become', protect, becomeInstructor);

// Instructor-only routes
router.get('/dashboard', protect, instructorOnly, getInstructorDashboard);
router.get('/courses', protect, instructorOnly, getInstructorCourses);
router.post('/course', protect, instructorOnly, createCourseLimiter, createMarketplaceCourse);
router.put('/course/:id', protect, instructorOnly, updateMarketplaceCourse);
router.get('/course/:id/sales', protect, instructorOnly, getCourseSales);
router.get('/profile', protect, instructorOnly, getInstructorProfile);
router.put('/profile', protect, instructorOnly, updateInstructorProfile);
router.get('/bank-details', protect, instructorOnly, getBankDetails);
router.post('/bank-details', protect, instructorOnly, saveBankDetails);
router.get('/earnings', protect, instructorOnly, getEarnings);
router.post('/claims', protect, instructorOnly, createClaim);
router.post('/commission', protect, instructorOnly, proofUpload.single('proof'), payCommission);

module.exports = router;
