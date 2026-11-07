const asyncHandler = require('express-async-handler');
const InstructorAIConfig = require('../models/InstructorAIConfig');
const Course = require('../models/Course');
const CourseInstructor = require('../models/CourseInstructor');
const { encrypt, decrypt } = require('../utils/encryption');
const { generateQuiz, generateNotes, testConnection } = require('../services/aiService');

// Mask API key for display: show first 4 and last 4 chars
function maskKey(key) {
    if (!key || key.length < 12) return '••••••••';
    return key.slice(0, 4) + '••••••••' + key.slice(-4);
}

// ─── Get AI Config ──────────────────────────────────────────────────
// GET /api/ai/config
const getConfig = asyncHandler(async (req, res) => {
    const config = await InstructorAIConfig.findOne({ instructor: req.user._id });
    if (!config) {
        return res.json(null);
    }

    // Decrypt key only to mask it
    let maskedKey = '••••••••';
    try {
        const plainKey = decrypt(config.apiKey);
        maskedKey = maskKey(plainKey);
    } catch (e) {
        // If decryption fails, show generic mask
    }

    res.json({
        _id: config._id,
        provider: config.provider,
        model: config.model,
        apiKeyMasked: maskedKey,
        isActive: config.isActive,
        updatedAt: config.updatedAt
    });
});

// ─── Save/Update AI Config ──────────────────────────────────────────
// POST /api/ai/config
const saveConfig = asyncHandler(async (req, res) => {
    const { provider, apiKey, model } = req.body;

    if (!provider || !apiKey || !model) {
        res.status(400);
        throw new Error('Provider, API key, and model are required');
    }

    if (!['openai', 'gemini', 'anthropic'].includes(provider)) {
        res.status(400);
        throw new Error('Invalid provider. Must be openai, gemini, or anthropic');
    }

    const encryptedKey = encrypt(apiKey);

    const config = await InstructorAIConfig.findOneAndUpdate(
        { instructor: req.user._id },
        { provider, apiKey: encryptedKey, model, isActive: true },
        { upsert: true, new: true }
    );

    res.json({
        _id: config._id,
        provider: config.provider,
        model: config.model,
        apiKeyMasked: maskKey(apiKey),
        isActive: config.isActive,
        updatedAt: config.updatedAt
    });
});

// ─── Delete AI Config ───────────────────────────────────────────────
// DELETE /api/ai/config
const deleteConfig = asyncHandler(async (req, res) => {
    const config = await InstructorAIConfig.findOneAndDelete({ instructor: req.user._id });
    if (!config) {
        res.status(404);
        throw new Error('No AI configuration found');
    }
    res.json({ message: 'AI configuration deleted' });
});

// ─── Test Connection ────────────────────────────────────────────────
// POST /api/ai/test
const testConfig = asyncHandler(async (req, res) => {
    const { provider, apiKey, model } = req.body;

    if (!provider || !apiKey || !model) {
        res.status(400);
        throw new Error('Provider, API key, and model are required');
    }

    try {
        const ok = await testConnection(apiKey, provider, model);
        res.json({ success: ok, message: ok ? 'Connection successful!' : 'Connection test returned unexpected response' });
    } catch (error) {
        res.status(400);
        throw new Error(`Connection failed: ${error.message}`);
    }
});

// ─── Helper: get instructor's decrypted config ─────────────────────────
async function getInstructorAI(userId) {
    const config = await InstructorAIConfig.findOne({ instructor: userId, isActive: true });
    if (!config) {
        const err = new Error('No AI configuration found. Please set up your API key in AI Settings.');
        err.statusCode = 400;
        throw err;
    }
    const apiKey = decrypt(config.apiKey);
    return { apiKey, provider: config.provider, model: config.model };
}

// ─── Helper: verify course access ───────────────────────────────────
async function verifyCourseAccess(userId, courseId) {
    const course = await Course.findById(courseId);
    if (!course) {
        const err = new Error('Course not found');
        err.statusCode = 404;
        throw err;
    }
    // Owner
    if (course.user.toString() === userId.toString()) return course;
    // Instructor with content permission
    const instructor = await CourseInstructor.findOne({ course: courseId, instructor: userId });
    if (instructor && (instructor.permissions.manage_content || instructor.permissions.full_access)) return course;
    const err = new Error('Not authorized to generate content for this course');
    err.statusCode = 403;
    throw err;
}

// ─── Generate Quiz ──────────────────────────────────────────────────
// POST /api/ai/generate-quiz
const aiGenerateQuiz = asyncHandler(async (req, res) => {
    const { courseId, topic, numQuestions = 5, questionTypes = ['mcq'], difficulty = 'intermediate' } = req.body;

    if (!courseId || !topic) {
        res.status(400);
        throw new Error('courseId and topic are required');
    }

    const course = await verifyCourseAccess(req.user._id, courseId);
    const { apiKey, provider, model } = await getInstructorAI(req.user._id);

    const questions = await generateQuiz(apiKey, provider, model, {
        topic,
        numQuestions: Math.min(numQuestions, 30),
        questionTypes,
        difficulty,
        courseContext: `${course.title} - ${course.description || ''}`
    });

    res.json({ questions });
});

// ─── Generate Notes ─────────────────────────────────────────────────
// POST /api/ai/generate-notes
const aiGenerateNotes = asyncHandler(async (req, res) => {
    const { courseId, topic, style = 'detailed' } = req.body;

    if (!courseId || !topic) {
        res.status(400);
        throw new Error('courseId and topic are required');
    }

    const course = await verifyCourseAccess(req.user._id, courseId);
    const { apiKey, provider, model } = await getInstructorAI(req.user._id);

    const notes = await generateNotes(apiKey, provider, model, {
        topic,
        style,
        courseContext: `${course.title} - ${course.description || ''}`
    });

    res.json({ notes });
});

module.exports = { getConfig, saveConfig, deleteConfig, testConfig, aiGenerateQuiz, aiGenerateNotes };
