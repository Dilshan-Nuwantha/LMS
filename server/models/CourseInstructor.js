const mongoose = require('mongoose');

/**
 * Permission levels for course instructors:
 * - manage_content: Add/edit/delete lectures and sections
 * - manage_students: Enroll/remove students, view progress
 * - full_access: All permissions including course settings
 */
const courseInstructorSchema = new mongoose.Schema({
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    instructor: {
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
        }
    }
}, {
    timestamps: true
});

// Compound index to ensure unique instructor per course
courseInstructorSchema.index({ course: 1, instructor: 1 }, { unique: true });

// Virtual to check if instructor has any permission
courseInstructorSchema.virtual('hasAnyPermission').get(function() {
    return this.permissions.manage_content ||
           this.permissions.manage_students ||
           this.permissions.full_access;
});

module.exports = mongoose.model('CourseInstructor', courseInstructorSchema);
