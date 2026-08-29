const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    questionText: {
        type: String,
        required: [true, 'Question text is required']
    },
    questionType: {
        type: String,
        enum: ['mcq', 'true-false', 'short-answer'],
        default: 'mcq'
    },
    options: [{
        type: String
    }],
    correctAnswer: {
        type: mongoose.Schema.Types.Mixed, // Index for MCQ, boolean for T/F, text for short-answer
        required: [true, 'Correct answer is required']
    },
    points: {
        type: Number,
        default: 1
    }
});

const quizSchema = new mongoose.Schema({
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    section: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    title: {
        type: String,
        required: [true, 'Quiz title is required']
    },
    description: {
        type: String,
        default: ''
    },
    questions: [questionSchema],
    passingScore: {
        type: Number,
        default: 70,
        min: 0,
        max: 100
    },
    timeLimit: {
        type: Number, // Minutes, 0 = no limit
        default: 0
    },
    attemptsAllowed: {
        type: Number, // -1 = unlimited
        default: -1
    },
    isRequired: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Index for efficient queries
quizSchema.index({ course: 1, section: 1 });
quizSchema.index({ course: 1, isActive: 1 });

// Virtual for total points
quizSchema.virtual('totalPoints').get(function() {
    return this.questions.reduce((sum, q) => sum + q.points, 0);
});

quizSchema.set('toJSON', { virtuals: true });
quizSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Quiz', quizSchema);