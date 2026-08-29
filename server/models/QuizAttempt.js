const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
    questionIndex: {
        type: Number,
        required: true
    },
    answer: {
        type: mongoose.Schema.Types.Mixed // Can be number (MCQ index), boolean, or string
    },
    isCorrect: {
        type: Boolean,
        default: false
    },
    pointsEarned: {
        type: Number,
        default: 0
    }
});

const quizAttemptSchema = new mongoose.Schema({
    quiz: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    answers: [answerSchema],
    score: {
        type: Number,
        default: 0
    },
    totalPoints: {
        type: Number,
        default: 0
    },
    percentage: {
        type: Number,
        default: 0
    },
    passed: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['in-progress', 'completed', 'timed-out'],
        default: 'in-progress'
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date
    },
    timeTaken: {
        type: Number, // Seconds
        default: 0
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
quizAttemptSchema.index({ quiz: 1, student: 1 });
quizAttemptSchema.index({ course: 1, student: 1 });
quizAttemptSchema.index({ student: 1, status: 1 });

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);