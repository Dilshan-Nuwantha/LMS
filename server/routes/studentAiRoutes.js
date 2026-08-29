const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const {
    getConfig, saveConfig, deleteConfig, testConfig,
    createConversation, getConversations, getConversation, renameConversation, deleteConversation, sendMessage,
    getCourseAIStatus
} = require('../controllers/studentAiController');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp'];
        cb(null, allowed.includes(file.mimetype));
    }
});

router.use(protect);

// Config
router.route('/config').get(getConfig).post(saveConfig).delete(deleteConfig);
router.post('/test', testConfig);

// Course AI status
router.get('/course/:courseId/ai-status', getCourseAIStatus);

// Conversations
router.route('/conversations').get(getConversations).post(createConversation);
router.route('/conversations/:id').get(getConversation).delete(deleteConversation);
router.put('/conversations/:id/title', renameConversation);
router.post('/conversations/:id/messages', upload.single('file'), sendMessage);

module.exports = router;
