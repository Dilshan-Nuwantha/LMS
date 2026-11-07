const asyncHandler = require('express-async-handler');
const CourseInstructor = require('../models/CourseInstructor');
const Course = require('../models/Course');
const User = require('../models/User');

// @desc    Add instructor to course
// @route   POST /api/courses/:courseId/instructors
// @access  Private (Course Owner, Admin, or Instructor with manage_instructors permission)
const addInstructor = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { email, permissions } = req.body;

    // Find user by email
    const instructor = await User.findOne({ email });
    if (!instructor) {
        res.status(404);
        throw new Error('User not found with this email');
    }

    if (instructor.role !== 'instructor') {
        res.status(400);
        throw new Error('Only instructors can be added to a course');
    }

    const course = req.course;

    // Cannot add course creator as an instructor (they already have full access)
    if (instructor._id.toString() === course.user.toString()) {
        res.status(400);
        throw new Error('Course creator already has full access');
    }

    // Check if instructor already exists for this course
    const existingInstructor = await CourseInstructor.findOne({
        course: courseId,
        instructor: instructor._id
    });

    if (existingInstructor) {
        res.status(400);
        throw new Error('This user is already an instructor for this course');
    }

    const courseInstructor = await CourseInstructor.create({
        course: courseId,
        instructor: instructor._id,
        addedBy: req.user.id,
        permissions: {
            manage_content: permissions?.manage_content || false,
            manage_students: permissions?.manage_students || false,
            full_access: permissions?.full_access || false
        }
    });

    // Populate instructor info before returning
    await courseInstructor.populate('instructor', 'name email');
    await courseInstructor.populate('addedBy', 'name');

    res.status(201).json(courseInstructor);
});

// @desc    Get all instructors for a course
// @route   GET /api/courses/:courseId/instructors
// @access  Private (Course Owner, Admin, or any course instructor)
const getCourseInstructors = asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    const instructors = await CourseInstructor.find({ course: courseId })
        .populate('instructor', 'name email')
        .populate('addedBy', 'name')
        .sort({ createdAt: -1 });

    // Also include course creator info
    const course = await Course.findById(courseId).populate('user', 'name email');

    res.status(200).json({
        creator: {
            _id: course.user._id,
            name: course.user.name,
            email: course.user.email,
            isCreator: true
        },
        instructors
    });
});

// @desc    Update instructor permissions
// @route   PUT /api/courses/:courseId/instructors/:instructorId
// @access  Private (Course Owner, Admin, or Instructor with manage_instructors permission)
const updateInstructorPermissions = asyncHandler(async (req, res) => {
    const { courseId, instructorId } = req.params;
    const { permissions } = req.body;

    const course = req.course;

    const courseInstructor = await CourseInstructor.findOne({
        course: courseId,
        instructor: instructorId
    });

    if (!courseInstructor) {
        res.status(404);
        throw new Error('Instructor not found for this course');
    }

    // Update permissions
    courseInstructor.permissions = {
        manage_content: permissions?.manage_content ?? courseInstructor.permissions.manage_content,
        manage_students: permissions?.manage_students ?? courseInstructor.permissions.manage_students,
        full_access: permissions?.full_access ?? courseInstructor.permissions.full_access
    };

    await courseInstructor.save();

    await courseInstructor.populate('instructor', 'name email');
    await courseInstructor.populate('addedBy', 'name');

    res.status(200).json(courseInstructor);
});

// @desc    Remove instructor from course
// @route   DELETE /api/courses/:courseId/instructors/:instructorId
// @access  Private (Course Owner, Admin, or Instructor with manage_instructors permission)
const removeInstructor = asyncHandler(async (req, res) => {
    const { courseId, instructorId } = req.params;

    const course = req.course;

    // Cannot remove course creator
    if (instructorId === course.user.toString()) {
        res.status(403);
        throw new Error('Cannot remove the course creator');
    }

    const courseInstructor = await CourseInstructor.findOneAndDelete({
        course: courseId,
        instructor: instructorId
    });

    if (!courseInstructor) {
        res.status(404);
        throw new Error('Instructor not found for this course');
    }

    res.status(200).json({ message: 'Instructor removed successfully', instructorId });
});

// @desc    Leave course (instructor removes themselves)
// @route   DELETE /api/courses/:courseId/instructors/leave
// @access  Private (Only the instructor themselves)
const leaveCourse = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const userId = req.user.id;

    const courseInstructor = await CourseInstructor.findOneAndDelete({
        course: courseId,
        instructor: userId
    });

    if (!courseInstructor) {
        res.status(404);
        throw new Error('You are not an instructor for this course');
    }

    res.status(200).json({ message: 'You have left the course successfully' });
});

// @desc    Get current user's permissions for a course
// @route   GET /api/courses/:courseId/my-permissions
// @access  Private
const getMyPermissions = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const userId = req.user.id;

    const course = await Course.findById(courseId);
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    // Check if user is admin
    if (req.user.role === 'admin') {
        return res.status(200).json({
            isAdmin: true,
            isCreator: false,
            isInstructor: false,
            permissions: {
                manage_content: true,
                manage_students: true,
                full_access: true
            }
        });
    }

    // Check if user is course creator
    if (course.user.toString() === userId) {
        return res.status(200).json({
            isAdmin: false,
            isCreator: true,
            isInstructor: false,
            permissions: {
                manage_content: true,
                manage_students: true,
                full_access: true
            }
        });
    }

    // Check if user is an instructor
    const courseInstructor = await CourseInstructor.findOne({
        course: courseId,
        instructor: userId
    });

    if (courseInstructor) {
        return res.status(200).json({
            isAdmin: false,
            isCreator: false,
            isInstructor: true,
            permissions: courseInstructor.permissions
        });
    }

    // User has no special permissions
    res.status(200).json({
        isAdmin: false,
        isCreator: false,
        isInstructor: false,
        permissions: {
            manage_content: false,
            manage_students: false,
            full_access: false
        }
    });
});

module.exports = {
    addInstructor,
    getCourseInstructors,
    updateInstructorPermissions,
    removeInstructor,
    leaveCourse,
    getMyPermissions
};
