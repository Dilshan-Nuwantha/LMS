const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        default: ''
    },
    type: {
        type: String,
        enum: ['new_content', 'broadcast', 'quiz', 'due_date', 'ai_access', 'milestone', 'custom'],
        required: true
    },
    link: {
        type: String,
        default: ''
    },
    read: {
        type: Boolean,
        default: false
    },
    priority: {
        type: String,
        enum: ['normal', 'important', 'urgent'],
        default: 'normal'
    }
}, {
    timestamps: true
});

// Index for fast unread count queries
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
