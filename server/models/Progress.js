const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Course'
    },
    completedLectures: [{
        lecture: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Lecture'
        },
        status: {
            type: String,
            default: 'Not Started'
        },
        notes: {
            type: String,
            required: false,
            default: ''
        },
        completedAt: {
            type: Date
        },
        markedForRevision: {
            type: Boolean,
            default: false
        }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Progress', progressSchema);
