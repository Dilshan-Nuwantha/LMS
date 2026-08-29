const asyncHandler = require('express-async-handler');
const TeacherAIConfig = require('../models/TeacherAIConfig');
const Conversation = require('../models/Conversation');
const Course = require('../models/Course');
const { encrypt, decrypt } = require('../utils/encryption');
const { testConnection, callChat } = require('../services/aiService');
const pdfParse = require('pdf-parse');

function maskKey(key) {
    if (!key || key.length < 12) return '••••••••';
    return key.slice(0, 4) + '••••••••' + key.slice(-4);
}

async function getStudentAI(userId, courseId = null, useInstructorKey = false) {
    // If student explicitly wants instructor key, skip own config
    if (!useInstructorKey) {
        const studentConfig = await TeacherAIConfig.findOne({ teacher: userId, isActive: true });
        if (studentConfig) {
            const apiKey = decrypt(studentConfig.apiKey);
            return { apiKey, provider: studentConfig.provider, model: studentConfig.model, source: 'student' };
        }
    }

    // Use instructor's config if course has allowStudentAI enabled
    if (courseId) {
        const course = await Course.findById(courseId).select('user allowStudentAI aiBlockedStudents');
        if (course && course.allowStudentAI) {
            const isBlocked = course.aiBlockedStudents?.some(id => id.toString() === userId.toString());
            if (isBlocked) {
                const err = new Error('Your access to the instructor\'s AI has been restricted for this course. Please contact your instructor.');
                err.statusCode = 403;
                throw err;
            }
            const instructorConfig = await TeacherAIConfig.findOne({ teacher: course.user, isActive: true });
            if (instructorConfig) {
                const apiKey = decrypt(instructorConfig.apiKey);
                return { apiKey, provider: instructorConfig.provider, model: instructorConfig.model, source: 'instructor' };
            }
        }
    }

    const err = new Error('No AI configuration found. Set up your API key in AI Chat Settings.');
    err.statusCode = 400;
    throw err;
}

// ─── AI STATUS for a course ────────────────────────────────────────
const getCourseAIStatus = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const userId = req.user._id;

    const [studentConfig, course] = await Promise.all([
        TeacherAIConfig.findOne({ teacher: userId, isActive: true }).select('_id'),
        Course.findById(courseId).select('user allowStudentAI aiBlockedStudents')
    ]);

    const hasOwnKey = !!studentConfig;
    const allowStudentAI = course?.allowStudentAI || false;
    const isBlocked = allowStudentAI && course?.aiBlockedStudents?.some(id => id.toString() === userId.toString());

    let instructorHasKey = false;
    if (allowStudentAI && !isBlocked && course?.user) {
        instructorHasKey = !!(await TeacherAIConfig.findOne({ teacher: course.user, isActive: true }).select('_id'));
    }

    res.json({ hasOwnKey, allowStudentAI, isBlocked: !!isBlocked, instructorHasKey });
});

// ─── CONFIG CRUD ───────────────────────────────────────────────────

const getConfig = asyncHandler(async (req, res) => {
    const config = await TeacherAIConfig.findOne({ teacher: req.user._id });
    if (!config) return res.json(null);

    let maskedKey = '••••••••';
    try { maskedKey = maskKey(decrypt(config.apiKey)); } catch {}

    res.json({
        _id: config._id,
        provider: config.provider,
        model: config.model,
        apiKeyMasked: maskedKey,
        isActive: config.isActive,
        updatedAt: config.updatedAt
    });
});

const saveConfig = asyncHandler(async (req, res) => {
    const { provider, apiKey, model } = req.body;
    if (!provider || !apiKey || !model) {
        res.status(400);
        throw new Error('Provider, API key, and model are required');
    }
    if (!['openai', 'gemini', 'anthropic'].includes(provider)) {
        res.status(400);
        throw new Error('Invalid provider');
    }
    const encryptedKey = encrypt(apiKey);
    const config = await TeacherAIConfig.findOneAndUpdate(
        { teacher: req.user._id },
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

const deleteConfig = asyncHandler(async (req, res) => {
    const config = await TeacherAIConfig.findOneAndDelete({ teacher: req.user._id });
    if (!config) { res.status(404); throw new Error('No AI configuration found'); }
    res.json({ message: 'AI configuration deleted' });
});

const testConfig = asyncHandler(async (req, res) => {
    const { provider, apiKey, model } = req.body;
    if (!provider || !apiKey || !model) {
        res.status(400);
        throw new Error('Provider, API key, and model are required');
    }
    try {
        const ok = await testConnection(apiKey, provider, model);
        res.json({ success: ok, message: ok ? 'Connection successful!' : 'Unexpected response' });
    } catch (error) {
        res.status(400);
        throw new Error(`Connection failed: ${error.message}`);
    }
});

// ─── INSTRUCTOR: View student AI conversations (instructor key only) ──
const getCourseStudentConversations = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).select('user allowStudentAI');
    if (!course) { res.status(404); throw new Error('Course not found'); }
    if (course.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        res.status(403); throw new Error('Not authorized');
    }
    if (!course.allowStudentAI) {
        res.status(403); throw new Error('Student AI is not enabled for this course');
    }

    const conversations = await Conversation.find({ course: courseId, useInstructorKey: true })
        .populate('user', 'name email')
        .select('user title messages createdAt updatedAt')
        .sort({ updatedAt: -1 })
        .lean();

    res.json(conversations);
});

// ─── CHAT ENDPOINTS ────────────────────────────────────────────────

const createConversation = asyncHandler(async (req, res) => {
    const { courseId, title, useInstructorKey } = req.body;
    const data = { user: req.user._id, title: title || 'New Conversation', messages: [] };

    if (courseId) {
        const course = await Course.findById(courseId);
        if (!course) { res.status(404); throw new Error('Course not found'); }
        data.course = courseId;
        data.title = title || `Chat about ${course.title}`;
        if (useInstructorKey) data.useInstructorKey = true;
    }

    const conversation = await Conversation.create(data);
    res.status(201).json(conversation);
});

const getConversations = asyncHandler(async (req, res) => {
    const { courseId } = req.query;
    const filter = { user: req.user._id };
    if (courseId) filter.course = courseId;

    const conversations = await Conversation.find(filter)
        .select('title course updatedAt messages')
        .sort({ updatedAt: -1 })
        .lean();

    res.json(conversations.map(c => ({
        _id: c._id,
        title: c.title,
        course: c.course,
        messageCount: c.messages.length,
        lastMessage: c.messages.length > 0
            ? c.messages[c.messages.length - 1].content.substring(0, 100)
            : null,
        useInstructorKey: c.useInstructorKey || false,
        updatedAt: c.updatedAt
    })));
});

const getConversation = asyncHandler(async (req, res) => {
    const conversation = await Conversation.findOne({
        _id: req.params.id,
        user: req.user._id
    }).populate('course', 'title description');
    if (!conversation) { res.status(404); throw new Error('Conversation not found'); }
    res.json(conversation);
});

const renameConversation = asyncHandler(async (req, res) => {
    const { title } = req.body;
    if (!title?.trim()) { res.status(400); throw new Error('Title is required'); }
    const conversation = await Conversation.findOne({ _id: req.params.id, user: req.user._id });
    if (!conversation) { res.status(404); throw new Error('Conversation not found'); }
    conversation.title = title.trim().substring(0, 100);
    conversation.titleEdited = true;
    await conversation.save();
    res.json({ title: conversation.title });
});

const deleteConversation = asyncHandler(async (req, res) => {
    const conversation = await Conversation.findOne({ _id: req.params.id, user: req.user._id });
    if (!conversation) { res.status(404); throw new Error('Conversation not found'); }
    if (conversation.useInstructorKey) {
        res.status(403);
        throw new Error('Conversations using instructor\'s AI key cannot be deleted.');
    }
    await conversation.deleteOne();
    res.json({ message: 'Conversation deleted' });
});

const sendMessage = asyncHandler(async (req, res) => {
    const conversation = await Conversation.findOne({
        _id: req.params.id,
        user: req.user._id
    }).populate('course', 'title description');
    if (!conversation) { res.status(404); throw new Error('Conversation not found'); }

    const { message } = req.body;
    const file = req.file;
    if (!message && !file) {
        res.status(400);
        throw new Error('Message or file is required');
    }

    const { apiKey, provider, model, source } = await getStudentAI(req.user._id, conversation.course?._id || null, conversation.useInstructorKey || false);

    let userText = message || '';
    let imageData = null;
    let attachmentMeta = null;

    if (file) {
        if (file.mimetype === 'application/pdf') {
            try {
                const pdfData = await pdfParse(file.buffer);
                const extracted = pdfData.text.substring(0, 15000);
                userText = `${userText}\n\n[Extracted from PDF "${file.originalname}"]\n${extracted}`;
                attachmentMeta = { fileName: file.originalname, fileType: 'pdf', mimeType: file.mimetype };
            } catch {
                res.status(400);
                throw new Error('Failed to parse PDF file');
            }
        } else if (file.mimetype.startsWith('image/')) {
            imageData = { base64: file.buffer.toString('base64'), mimeType: file.mimetype };
            attachmentMeta = { fileName: file.originalname, fileType: 'image', mimeType: file.mimetype };
            if (!userText) userText = 'Please analyze this image.';
        } else {
            res.status(400);
            throw new Error('Unsupported file type. Upload a PDF or image.');
        }
    }

    // Build system prompt
    let systemPrompt = 'You are a helpful AI study assistant. Be clear, educational, and thorough. Use markdown formatting.';
    if (conversation.course) {
        systemPrompt += `\n\nCourse: "${conversation.course.title}".`;
        if (conversation.course.description) {
            systemPrompt += ` Description: ${conversation.course.description}`;
        }
        systemPrompt += '\nKeep responses relevant to this course.';
    }

    // Include recent history for context
    const recent = conversation.messages.slice(-20);
    if (recent.length > 0) {
        systemPrompt += '\n\nRecent conversation:\n' + recent.map(m =>
            `${m.role === 'user' ? 'Student' : 'Assistant'}: ${m.content.substring(0, 500)}`
        ).join('\n');
    }

    const userMsg = { role: 'user', content: userText };
    if (attachmentMeta) userMsg.attachment = attachmentMeta;
    conversation.messages.push(userMsg);

    try {
        const aiResponse = await callChat(provider, apiKey, model, systemPrompt, userText, imageData);
        conversation.messages.push({ role: 'assistant', content: aiResponse });

        // Auto-title from first message (only if not manually renamed)
        if (!conversation.titleEdited && conversation.messages.length <= 2) {
            conversation.title = userText.substring(0, 50) + (userText.length > 50 ? '...' : '');
        }

        await conversation.save();
        const msgs = conversation.messages;
        res.json({
            userMessage: msgs[msgs.length - 2],
            assistantMessage: msgs[msgs.length - 1],
            source
        });
    } catch (error) {
        await conversation.save();
        res.status(502);
        throw new Error(`AI response failed: ${error.message}`);
    }
});

module.exports = {
    getConfig, saveConfig, deleteConfig, testConfig,
    createConversation, getConversations, getConversation, renameConversation, deleteConversation, sendMessage,
    getCourseAIStatus, getCourseStudentConversations
};
