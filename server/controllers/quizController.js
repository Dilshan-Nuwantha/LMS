const asyncHandler = require('express-async-handler');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Course = require('../models/Course');
const Progress = require('../models/Progress');
const { canManage, getTeacherPermissions } = require('../middleware/ownershipMiddleware');

// @desc    Create a new quiz
// @route   POST /api/quizzes
// @access  Private (Course owner or teacher with manage_content)
const createQuiz = asyncHandler(async (req, res) => {
    const { courseId, sectionId, title, description, questions, passingScore, timeLimit, attemptsAllowed, isRequired } = req.body;

    if (!courseId || !title) {
        res.status(400);
        throw new Error('Course ID and title are required');
    }

    // Verify course exists and user has permission
    const course = await Course.findById(courseId);
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    const userId = req.user.id;
    const isOwner = canManage(req.user, course.user);
    const teacherPerms = await getTeacherPermissions(userId, courseId);

    if (!isOwner && !teacherPerms?.manage_content && !teacherPerms?.full_access) {
        res.status(403);
        throw new Error('Not authorized to create quizzes for this course');
    }

    // Validate section exists if provided
    if (sectionId) {
        const sectionExists = course.sections.some(s => s._id.toString() === sectionId);
        if (!sectionExists) {
            res.status(400);
            throw new Error('Section not found in this course');
        }
    }

    const quiz = await Quiz.create({
        course: courseId,
        section: sectionId || null,
        title,
        description: description || '',
        questions: questions || [],
        passingScore: passingScore || 70,
        timeLimit: timeLimit || 0,
        attemptsAllowed: attemptsAllowed ?? -1,
        isRequired: isRequired || false,
        createdBy: userId
    });

    // Notification trigger: new quiz
    if (course.notificationSettings?.newQuiz) {
        const { notifyCourseStudents } = require('./notificationController');
        notifyCourseStudents(courseId, {
            title: `New Quiz: ${title}`,
            message: `A new quiz "${title}" is available in "${course.title}"`,
            type: 'quiz',
            link: `/course/${courseId}?tab=quizzes`
        });
    }

    res.status(201).json(quiz);
});

// @desc    Get all quizzes for a course
// @route   GET /api/quizzes/course/:courseId
// @access  Private
const getCourseQuizzes = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const userId = req.user.id;

    const course = await Course.findById(courseId);
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    const isOwner = canManage(req.user, course.user);
    const teacherPerms = await getTeacherPermissions(userId, courseId);
    const isTeacher = !!teacherPerms;

    // For owners/teachers, get all quizzes; for students, only active ones
    const filter = { course: courseId };
    if (!isOwner && !isTeacher) {
        filter.isActive = true;
    }

    const quizzes = await Quiz.find(filter)
        .select('-questions.correctAnswer') // Don't send answers to students
        .sort({ createdAt: 1 });

    // Get attempt counts for the current user
    const attempts = await QuizAttempt.find({
        quiz: { $in: quizzes.map(q => q._id) },
        student: userId
    }).select('quiz status percentage passed');

    const attemptsMap = {};
    attempts.forEach(a => {
        if (!attemptsMap[a.quiz]) attemptsMap[a.quiz] = [];
        attemptsMap[a.quiz].push(a);
    });

    const quizzesWithAttempts = quizzes.map(q => ({
        ...q.toObject(),
        userAttempts: attemptsMap[q._id] || [],
        attemptCount: (attemptsMap[q._id] || []).filter(a => a.status === 'completed').length,
        bestScore: Math.max(0, ...(attemptsMap[q._id] || []).filter(a => a.status === 'completed').map(a => a.percentage)),
        hasPassed: (attemptsMap[q._id] || []).some(a => a.passed)
    }));

    res.json(quizzesWithAttempts);
});

// @desc    Get single quiz
// @route   GET /api/quizzes/:id
// @access  Private
const getQuiz = asyncHandler(async (req, res) => {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
        res.status(404);
        throw new Error('Quiz not found');
    }

    const userId = req.user.id;
    const course = await Course.findById(quiz.course);
    const isOwner = canManage(req.user, course.user);
    const teacherPerms = await getTeacherPermissions(userId, quiz.course);

    // For owners/teachers, return full quiz with answers
    if (isOwner || teacherPerms?.manage_content || teacherPerms?.full_access) {
        return res.json(quiz);
    }

    // For students, hide correct answers
    const quizObj = quiz.toObject();
    quizObj.questions = quizObj.questions.map(q => ({
        ...q,
        correctAnswer: undefined
    }));

    res.json(quizObj);
});

// @desc    Update quiz
// @route   PUT /api/quizzes/:id
// @access  Private (Course owner or teacher with manage_content)
const updateQuiz = asyncHandler(async (req, res) => {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
        res.status(404);
        throw new Error('Quiz not found');
    }

    const userId = req.user.id;
    const course = await Course.findById(quiz.course);
    const isOwner = canManage(req.user, course.user);
    const teacherPerms = await getTeacherPermissions(userId, quiz.course);

    if (!isOwner && !teacherPerms?.manage_content && !teacherPerms?.full_access) {
        res.status(403);
        throw new Error('Not authorized to update this quiz');
    }

    const { title, description, questions, passingScore, timeLimit, attemptsAllowed, isRequired, isActive, sectionId } = req.body;

    quiz.title = title ?? quiz.title;
    quiz.description = description ?? quiz.description;
    quiz.questions = questions ?? quiz.questions;
    quiz.passingScore = passingScore ?? quiz.passingScore;
    quiz.timeLimit = timeLimit ?? quiz.timeLimit;
    quiz.attemptsAllowed = attemptsAllowed ?? quiz.attemptsAllowed;
    quiz.isRequired = isRequired ?? quiz.isRequired;
    quiz.isActive = isActive ?? quiz.isActive;
    quiz.section = sectionId !== undefined ? (sectionId || null) : quiz.section;

    await quiz.save();
    res.json(quiz);
});

// @desc    Delete quiz
// @route   DELETE /api/quizzes/:id
// @access  Private (Course owner or teacher with manage_content)
const deleteQuiz = asyncHandler(async (req, res) => {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
        res.status(404);
        throw new Error('Quiz not found');
    }

    const userId = req.user.id;
    const course = await Course.findById(quiz.course);
    const isOwner = canManage(req.user, course.user);
    const teacherPerms = await getTeacherPermissions(userId, quiz.course);

    if (!isOwner && !teacherPerms?.manage_content && !teacherPerms?.full_access) {
        res.status(403);
        throw new Error('Not authorized to delete this quiz');
    }

    // Delete all attempts for this quiz
    await QuizAttempt.deleteMany({ quiz: quiz._id });
    await quiz.deleteOne();

    res.json({ message: 'Quiz deleted successfully' });
});

// @desc    Start a quiz attempt
// @route   POST /api/quizzes/:id/start
// @access  Private (Enrolled students)
const startQuizAttempt = asyncHandler(async (req, res) => {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
        res.status(404);
        throw new Error('Quiz not found');
    }

    if (!quiz.isActive) {
        res.status(400);
        throw new Error('This quiz is not available');
    }

    const userId = req.user.id;

    // Check if user is enrolled in the course
    const progress = await Progress.findOne({ course: quiz.course, student: userId });
    if (!progress) {
        res.status(403);
        throw new Error('You must be enrolled in this course to take the quiz');
    }

    // Check for existing in-progress attempt
    const existingAttempt = await QuizAttempt.findOne({
        quiz: quiz._id,
        student: userId,
        status: 'in-progress'
    });

    if (existingAttempt) {
        // Return existing attempt
        return res.json({
            attempt: existingAttempt,
            quiz: {
                ...quiz.toObject(),
                questions: quiz.questions.map(q => ({ ...q.toObject(), correctAnswer: undefined }))
            }
        });
    }

    // Check attempt limit
    if (quiz.attemptsAllowed > 0) {
        const completedAttempts = await QuizAttempt.countDocuments({
            quiz: quiz._id,
            student: userId,
            status: { $in: ['completed', 'timed-out'] }
        });

        if (completedAttempts >= quiz.attemptsAllowed) {
            res.status(400);
            throw new Error(`Maximum attempts (${quiz.attemptsAllowed}) reached for this quiz`);
        }
    }

    // Create new attempt
    const attempt = await QuizAttempt.create({
        quiz: quiz._id,
        student: userId,
        course: quiz.course,
        totalPoints: quiz.questions.reduce((sum, q) => sum + q.points, 0),
        startedAt: new Date()
    });

    res.status(201).json({
        attempt,
        quiz: {
            ...quiz.toObject(),
            questions: quiz.questions.map(q => ({ ...q.toObject(), correctAnswer: undefined }))
        }
    });
});

// @desc    Submit quiz answers
// @route   POST /api/quizzes/:id/submit
// @access  Private
const submitQuizAttempt = asyncHandler(async (req, res) => {
    const { attemptId, answers } = req.body;

    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt) {
        res.status(404);
        throw new Error('Attempt not found');
    }

    if (attempt.student.toString() !== req.user.id) {
        res.status(403);
        throw new Error('Not authorized');
    }

    if (attempt.status !== 'in-progress') {
        res.status(400);
        throw new Error('This attempt has already been submitted');
    }

    const quiz = await Quiz.findById(attempt.quiz);
    if (!quiz) {
        res.status(404);
        throw new Error('Quiz not found');
    }

    // Check time limit
    if (quiz.timeLimit > 0) {
        const elapsedMinutes = (Date.now() - attempt.startedAt.getTime()) / 60000;
        if (elapsedMinutes > quiz.timeLimit + 1) { // 1 minute grace period
            attempt.status = 'timed-out';
            attempt.completedAt = new Date();
            attempt.timeTaken = Math.round(elapsedMinutes * 60);
            await attempt.save();

            res.status(400);
            throw new Error('Time limit exceeded');
        }
    }

    // Grade the quiz
    let score = 0;
    const gradedAnswers = [];

    answers.forEach(ans => {
        const question = quiz.questions[ans.questionIndex];
        if (!question) return;

        let isCorrect = false;

        if (question.questionType === 'mcq') {
            isCorrect = ans.answer === question.correctAnswer;
        } else if (question.questionType === 'true-false') {
            isCorrect = ans.answer === question.correctAnswer;
        } else if (question.questionType === 'short-answer') {
            // Case-insensitive comparison for short answers
            isCorrect = ans.answer?.toLowerCase().trim() === question.correctAnswer?.toLowerCase().trim();
        }

        const pointsEarned = isCorrect ? question.points : 0;
        score += pointsEarned;

        gradedAnswers.push({
            questionIndex: ans.questionIndex,
            answer: ans.answer,
            isCorrect,
            pointsEarned
        });
    });

    const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
    const passed = percentage >= quiz.passingScore;

    attempt.answers = gradedAnswers;
    attempt.score = score;
    attempt.totalPoints = totalPoints;
    attempt.percentage = percentage;
    attempt.passed = passed;
    attempt.status = 'completed';
    attempt.completedAt = new Date();
    attempt.timeTaken = Math.round((attempt.completedAt - attempt.startedAt) / 1000);

    await attempt.save();

    // Return result with correct answers for review
    res.json({
        attempt,
        quiz: quiz.toObject(),
        result: {
            score,
            totalPoints,
            percentage,
            passed,
            passingScore: quiz.passingScore
        }
    });
});

// @desc    Get quiz attempt results
// @route   GET /api/quizzes/attempts/:attemptId
// @access  Private
const getAttemptResult = asyncHandler(async (req, res) => {
    const attempt = await QuizAttempt.findById(req.params.attemptId)
        .populate('quiz');

    if (!attempt) {
        res.status(404);
        throw new Error('Attempt not found');
    }

    const userId = req.user.id;
    const course = await Course.findById(attempt.course);
    const isOwner = canManage(req.user, course.user);
    const teacherPerms = await getTeacherPermissions(userId, attempt.course);

    // Only allow the student who took it, or course owner/teacher
    if (attempt.student.toString() !== userId && !isOwner && !teacherPerms) {
        res.status(403);
        throw new Error('Not authorized to view this attempt');
    }

    res.json(attempt);
});

// @desc    Get student's attempts for a quiz
// @route   GET /api/quizzes/:id/my-attempts
// @access  Private
const getMyAttempts = asyncHandler(async (req, res) => {
    const attempts = await QuizAttempt.find({
        quiz: req.params.id,
        student: req.user.id
    }).sort({ createdAt: -1 });

    res.json(attempts);
});

// @desc    Get quiz analytics (for teachers)
// @route   GET /api/quizzes/:id/analytics
// @access  Private (Course owner or teacher)
const getQuizAnalytics = asyncHandler(async (req, res) => {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
        res.status(404);
        throw new Error('Quiz not found');
    }

    const userId = req.user.id;
    const course = await Course.findById(quiz.course);
    const isOwner = canManage(req.user, course.user);
    const teacherPerms = await getTeacherPermissions(userId, quiz.course);

    if (!isOwner && !teacherPerms) {
        res.status(403);
        throw new Error('Not authorized to view analytics');
    }

    // Get all completed attempts
    const attempts = await QuizAttempt.find({
        quiz: quiz._id,
        status: 'completed'
    }).populate('student', 'name email');

    const totalAttempts = attempts.length;
    const passedAttempts = attempts.filter(a => a.passed).length;
    const avgScore = totalAttempts > 0
        ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / totalAttempts)
        : 0;
    const avgTimeTaken = totalAttempts > 0
        ? Math.round(attempts.reduce((sum, a) => sum + a.timeTaken, 0) / totalAttempts)
        : 0;

    // Question-wise stats
    const questionStats = quiz.questions.map((q, idx) => {
        const answersForQuestion = attempts.flatMap(a =>
            a.answers.filter(ans => ans.questionIndex === idx)
        );
        const correctCount = answersForQuestion.filter(a => a.isCorrect).length;
        return {
            questionIndex: idx,
            questionText: q.questionText,
            totalAnswers: answersForQuestion.length,
            correctCount,
            correctRate: answersForQuestion.length > 0
                ? Math.round((correctCount / answersForQuestion.length) * 100)
                : 0
        };
    });

    // Top performers
    const studentBest = {};
    attempts.forEach(a => {
        const sid = a.student._id.toString();
        if (!studentBest[sid] || a.percentage > studentBest[sid].percentage) {
            studentBest[sid] = {
                student: a.student,
                percentage: a.percentage,
                passed: a.passed,
                timeTaken: a.timeTaken
            };
        }
    });

    const topPerformers = Object.values(studentBest)
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 10);

    res.json({
        quizTitle: quiz.title,
        totalQuestions: quiz.questions.length,
        passingScore: quiz.passingScore,
        overview: {
            totalAttempts,
            uniqueStudents: Object.keys(studentBest).length,
            passedAttempts,
            passRate: totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0,
            avgScore,
            avgTimeTaken
        },
        questionStats,
        topPerformers,
        recentAttempts: attempts.slice(-10).reverse()
    });
});

module.exports = {
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
};