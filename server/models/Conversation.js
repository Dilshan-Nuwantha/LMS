const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    attachment: {
        fileName: String,
        fileType: String,   // 'pdf' or 'image'
        mimeType: String
    }
}, { timestamps: true });

const conversationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        default: null
    },
    title: {
        type: String,
        default: 'New Conversation'
    },
    messages: [messageSchema],
    useInstructorKey: {
        type: Boolean,
        default: false
    },
    titleEdited: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

conversationSchema.index({ user: 1, updatedAt: -1 });
conversationSchema.index({ user: 1, course: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
