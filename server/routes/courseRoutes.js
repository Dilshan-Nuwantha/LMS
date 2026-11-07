const express = require('express');
const router = express.Router();
const {
    createCourse,
    updateCourse,
    deleteCourse,
    getCourses,
    getCourse,
    addSection,
    updateSection,
    deleteSection,
    addLectureToSection,
    enrollStudent,
    getEnrolledCourses,
    getCreatedCourses,
    updateLectureProgress,
    toggleLectureRevision,
    getStudentActivity,
    getCourseProgresses,
    addComment,
    getLectureComments,
    updateLecture,
    deleteLecture,
    getLecture,
    getUserStats,
    removeStudent,
    getMyProgress,
    getCourseAnalytics,
    searchCourses,
    getStudentProgressDetail,
    getEnrolledStudentList,
    getPeerStudentList,
    getPeerStudentProgress,
    getMyAnalytics,
    toggleStudentAI,
    toggleAIBlockStudent
} = require('../controllers/courseController');
const {
    addInstructor,
    getCourseInstructors,
    updateInstructorPermissions,
    removeInstructor,
    leaveCourse,
    getMyPermissions
} = require('../controllers/courseInstructorController');
const {
    protect,
    instructorOnly
} = require('../middleware/authMiddleware');
const {
    verifyCourseOwnership,
    verifyLectureOwnership,
    verifyCourseContentPermission,
    verifyStudentManagementPermission,
    verifyInstructorManagementPermission,
    verifyCourseAccess
} = require('../middleware/ownershipMiddleware');
const { createCourseLimiter } = require('../middleware/rateLimiter');

// Static routes first (no :id params)
router.get('/', protect, getCourses);
router.get('/search', protect, searchCourses);
router.get('/my/enrolled', protect, getEnrolledCourses);
router.get('/my/created', protect, getCreatedCourses);
router.get('/my/stats', protect, getUserStats);
router.post(
    '/',
    protect,
    instructorOnly,
    createCourseLimiter,
    createCourse
);

// Lecture routes (before :id routes to avoid conflicts)
router.put('/lectures/:id/progress', protect, updateLectureProgress);
router.put('/lectures/:id/toggle-revision', protect, toggleLectureRevision);
router.post('/lectures/:id/comments', protect, addComment);
router.get('/lectures/:id/comments', protect, getLectureComments);
router.get('/lectures/:id', protect, getLecture);
router.put('/lectures/:id', protect, verifyLectureOwnership, updateLecture);
router.delete('/lectures/:id', protect, verifyLectureOwnership, deleteLecture);

// Course-specific routes with sub-paths (before generic :id)
// Instructor management routes
router.get('/:courseId/my-permissions', protect, getMyPermissions);
router.get('/:courseId/instructors', protect, verifyCourseAccess, getCourseInstructors);
router.post('/:courseId/instructors', protect, verifyInstructorManagementPermission, addInstructor);
router.delete('/:courseId/instructors/leave', protect, leaveCourse); // Instructor leaves course (must be before :instructorId)
router.put('/:courseId/instructors/:instructorId', protect, verifyInstructorManagementPermission, updateInstructorPermissions);
router.delete('/:courseId/instructors/:instructorId', protect, verifyInstructorManagementPermission, removeInstructor);

// Course content routes
router.post('/:id/sections', protect, verifyCourseContentPermission, addSection);
router.put('/:id/sections/:sectionId', protect, verifyCourseContentPermission, updateSection);
router.delete('/:id/sections/:sectionId', protect, verifyCourseContentPermission, deleteSection);
router.post('/:id/sections/:sectionId/lectures', protect, verifyCourseContentPermission, addLectureToSection);

// Student management routes
router.post('/:id/enroll', protect, verifyStudentManagementPermission, enrollStudent);
router.get('/:id/activity/:studentId', protect, verifyStudentManagementPermission, getStudentActivity);
router.get('/:id/progress/:studentId', protect, verifyStudentManagementPermission, getStudentProgressDetail);
router.get('/:id/progresses', protect, verifyStudentManagementPermission, getCourseProgresses);
router.get('/:id/enrolled-students', protect, verifyStudentManagementPermission, getEnrolledStudentList);
router.delete('/:id/enroll/:studentId', protect, verifyStudentManagementPermission, removeStudent);

// Analytics route
router.get('/:id/analytics', protect, verifyCourseAccess, getCourseAnalytics);

// Peer progress routes (student-facing, controlled by allowPeerProgress setting)
router.get('/:id/peers', protect, getPeerStudentList);
router.get('/:id/peers/:studentId/progress', protect, getPeerStudentProgress);

// Student progress route (for current user)
router.get('/:id/my-progress', protect, getMyProgress);
router.get('/:id/my-analytics', protect, getMyAnalytics);

router.put('/:id/toggle-student-ai', protect, toggleStudentAI);
router.put('/:id/ai-block/:studentId', protect, toggleAIBlockStudent);

// Generic course routes (must be LAST)
router.get('/:id', protect, getCourse);
router.put('/:id', protect, verifyCourseOwnership, updateCourse);
router.delete('/:id', protect, verifyCourseOwnership, deleteCourse);

module.exports = router;
