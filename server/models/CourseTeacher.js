const mongoose = require('mongoose');

/**
 * Permission levels for course teachers:
 * - manage_content: Add/edit/delete lectures and sections
 * - manage_students: Enroll/remove students, view progress
 * - full_access: All permissions including course settings
 * - manage_teachers: Can add/remove other teachers (except course creator)
 */
const courseTeacherSchema = new mongoose.Schema({
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    permissions: {
        manage_content: {
            type: Boolean,
            default: false
        },
        manage_students: {
            type: Boolean,
            default: false
        },
        full_access: {
            type: Boolean,
            default: false
        },
        manage_teachers: {
            type: Boolean,
            default: false
        }
    }
}, {
    timestamps: true
});

// Compound index to ensure unique teacher per course
courseTeacherSchema.index({ course: 1, teacher: 1 }, { unique: true });

// Virtual to check if teacher has any permission
courseTeacherSchema.virtual('hasAnyPermission').get(function() {
    return this.permissions.manage_content ||
           this.permissions.manage_students ||
           this.permissions.full_access ||
           this.permissions.manage_teachers;
});

module.exports = mongoose.model('CourseTeacher', courseTeacherSchema);
