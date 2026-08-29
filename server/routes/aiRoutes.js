const express = require('express');
const router = express.Router();
const { protect, instructorOnly } = require('../middleware/authMiddleware');
const { getConfig, saveConfig, deleteConfig, testConfig, aiGenerateQuiz, aiGenerateNotes } = require('../controllers/aiController');
const { getCourseStudentConversations } = require('../controllers/studentAiController');

// All AI routes require auth + instructor role
router.use(protect, instructorOnly);

// Config management
router.route('/config')
    .get(getConfig)
    .post(saveConfig)
    .delete(deleteConfig);

// Test connection
router.post('/test', testConfig);

// View student AI conversations per course (instructor only)
router.get('/course/:courseId/student-conversations', getCourseStudentConversations);

// Generation
router.post('/generate-quiz', aiGenerateQuiz);
router.post('/generate-notes', aiGenerateNotes);

module.exports = router;
