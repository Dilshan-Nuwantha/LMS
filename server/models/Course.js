const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a course title']
    },
    description: {
        type: String,
        required: [true, 'Please add a description']
    },
    status: {
        type: String,
        enum: ['Draft', 'Published', 'Archived'],
        default: 'Draft'
    },
    lectureStatuses: {
        type: [{
            label: { type: String, required: true },
            color: { type: String, default: '#475569' }
        }],
        default: [
            { label: 'Not Started', color: '#64748b' },
            { label: 'In Progress', color: '#f59e0b' },
            { label: 'Completed', color: '#10b981' }
        ]
    },
    completedStatus: {
        type: String,
        default: 'Completed'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    allowStudentBroadcasts: {
        type: Boolean,
        default: false
    },
    allowPeerProgress: {
        type: Boolean,
        default: false
    },
    allowStudentUploads: {
        type: Boolean,
        default: false
    },
    allowStudentAI: {
        type: Boolean,
        default: false
    },
    aiBlockedStudents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    notificationSettings: {
        newContent: { type: Boolean, default: false },
        newBroadcast: { type: Boolean, default: false },
        newQuiz: { type: Boolean, default: false },
        dueDateReminder: { type: Boolean, default: false },
        aiAccessChange: { type: Boolean, default: false },
        progressMilestone: { type: Boolean, default: false }
    },
    sections: [{
        title: { type: String, required: true },
        isPublic: { type: Boolean, default: false },
        isPreview: { type: Boolean, default: false },
        importance: { type: String, enum: ['Optional', 'Normal', 'Important', 'Very Important', ''], default: '' },
        lectures: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Lecture'
        }]
    }],
    // Marketplace fields
    isMarketplace: {
        type: Boolean,
        default: false
    },
    price: {
        type: Number,
        default: 0
    },
    currency: {
        type: String,
        enum: ['INR', 'USD'],
        default: 'INR'
    },
    originalPrice: {
        type: Number,
        default: 0
    },
    thumbnail: {
        type: String,
        default: ''
    },
    previewVideo: {
        type: String,
        default: ''
    },
    category: {
        type: String,
        default: ''
    },
    level: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced', ''],
        default: ''
    },
    requirements: [{
        type: String
    }],
    whatYouWillLearn: [{
        type: String
    }],
    language: {
        type: String,
        default: 'English'
    },
    totalDuration: {
        type: Number,
        default: 0
    },
    enrollmentCount: {
        type: Number,
        default: 0
    },
    tags: [{
        type: String
    }],
    rating: {
        average: { type: Number, default: 0 },
        count: { type: Number, default: 0 }
    },
    // Admin moderation fields
    isAdminBlocked: { type: Boolean, default: false },
    adminBlockReason: { type: String, default: '' }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for backward compatibility or flat list if needed, 
// but primarily we use sections now.
courseSchema.virtual('totalLectures').get(function () {
    if (!this.sections) return 0;
    return this.sections.reduce((acc, sec) => acc + sec.lectures.length, 0);
});

module.exports = mongoose.model('Course', courseSchema);
