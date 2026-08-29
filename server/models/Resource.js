const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: [true, 'Please add a title']
    },
    description: {
        type: String,
        default: ''
    },
    fileType: {
        type: String,
        enum: ['image', 'pdf', 'document', 'link'],
        required: true
    },
    // For uploaded files (stored as base64)
    fileData: {
        type: String
    },
    mimeType: {
        type: String
    },
    fileName: {
        type: String
    },
    fileSize: {
        type: Number
    },
    // For link-type resources
    url: {
        type: String
    },
    // Who uploaded: teacher or student
    uploaderRole: {
        type: String,
        enum: ['teacher', 'student'],
        default: 'teacher'
    },
    // Linking to section or lecture (optional — null/course = course-level resource)
    linkedType: {
        type: String,
        enum: ['course', 'section', 'lecture'],
        default: 'course'
    },
    sectionId: {
        type: String,  // Mongoose sub-doc ID (sections are embedded in Course)
        default: null
    },
    lectureId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lecture',
        default: null
    }
}, {
    timestamps: true
});

resourceSchema.index({ course: 1, createdAt: -1 });
resourceSchema.index({ course: 1, uploadedBy: 1 });
resourceSchema.index({ lectureId: 1 });

module.exports = mongoose.model('Resource', resourceSchema);
