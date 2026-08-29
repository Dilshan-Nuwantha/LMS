const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    },
    lecture: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lecture'
    },
    action: {
        type: String,
        required: true
    },
    method: {
        type: String,
        required: true
    },
    url: {
        type: String
    },
    data: {
        type: mongoose.Schema.Types.Mixed
    },
    ip: {
        type: String
    },
    details: {
        type: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Activity', activitySchema);
