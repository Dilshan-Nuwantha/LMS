const mongoose = require('mongoose');

const lectureSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a lecture title']
    },
    number: {
        type: Number,
        required: [true, 'Please add a lecture number']
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Course'
    },
    resourceUrl: {
        type: String,
        required: false
    },
    description: {
        type: String
    },
    dueDate: {
        type: Date
    },
    status: {
        type: String,
        default: 'Pending'
    },
    isPreview: {
        type: Boolean,
        default: false
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    importance: {
        type: String,
        enum: ['None', 'Optional', 'Normal', 'Important', 'Very Important', ''],
        default: ''
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Lecture', lectureSchema);
