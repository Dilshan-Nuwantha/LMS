const express = require('express');
const router = express.Router();
const {
    createQuiz,
    getCourseQuizzes,
    getQuiz,
    updateQuiz,
    deleteQuiz,
    startQuizAttempt,
    submitQuizAttempt,
    getAttemptResult,
    getMyAttempts,
    getQuizAnalytics
} = require('../controllers/quizController');
const { protect } = require('../middleware/authMiddleware');

// Quiz CRUD routes
router.post('/', protect, createQuiz);
router.get('/course/:courseId', protect, getCourseQuizzes);
router.get('/attempts/:attemptId', protect, getAttemptResult);
router.get('/:id', protect, getQuiz);
router.put('/:id', protect, updateQuiz);
router.delete('/:id', protect, deleteQuiz);

// Quiz attempt routes
router.post('/:id/start', protect, startQuizAttempt);
router.post('/:id/submit', protect, submitQuizAttempt);
router.get('/:id/my-attempts', protect, getMyAttempts);
router.get('/:id/analytics', protect, getQuizAnalytics);

module.exports = router;