const asyncHandler = require('express-async-handler');
const CourseTeacher = require('../models/CourseTeacher');
const Course = require('../models/Course');
const User = require('../models/User');

// @desc    Add teacher to course
// @route   POST /api/courses/:courseId/teachers
// @access  Private (Course Owner, Admin, or Teacher with manage_teachers permission)
const addTeacher = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { email, permissions } = req.body;

    // Find user by email
    const teacher = await User.findOne({ email });
    if (!teacher) {
        res.status(404);
        throw new Error('User not found with this email');
    }

    const course = req.course;

    // Cannot add course creator as a teacher (they already have full access)
    if (teacher._id.toString() === course.user.toString()) {
        res.status(400);
        throw new Error('Course creator already has full access');
    }

    // Check if teacher already exists for this course
    const existingTeacher = await CourseTeacher.findOne({
        course: courseId,
        teacher: teacher._id
    });

    if (existingTeacher) {
        res.status(400);
        throw new Error('This user is already a teacher for this course');
    }

    // Only admin or course creator can grant full_access or manage_teachers
    const isAdminOrCreator = req.user.role === 'admin' || course.user.toString() === req.user.id;
    const canGrantFullAccess = isAdminOrCreator;
    const canGrantManageTeachers = isAdminOrCreator;

    const courseTeacher = await CourseTeacher.create({
        course: courseId,
        teacher: teacher._id,
        addedBy: req.user.id,
        permissions: {
            manage_content: permissions?.manage_content || false,
            manage_students: permissions?.manage_students || false,
            full_access: canGrantFullAccess ? (permissions?.full_access || false) : false,
            manage_teachers: canGrantManageTeachers ? (permissions?.manage_teachers || false) : false
        }
    });

    // Populate teacher info before returning
    await courseTeacher.populate('teacher', 'name email');
    await courseTeacher.populate('addedBy', 'name');

    res.status(201).json(courseTeacher);
});

// @desc    Get all teachers for a course
// @route   GET /api/courses/:courseId/teachers
// @access  Private (Course Owner, Admin, or any course teacher)
const getCourseTeachers = asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    const teachers = await CourseTeacher.find({ course: courseId })
        .populate('teacher', 'name email')
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
        teachers
    });
});

// @desc    Update teacher permissions
// @route   PUT /api/courses/:courseId/teachers/:teacherId
// @access  Private (Course Owner, Admin, or Teacher with manage_teachers permission)
const updateTeacherPermissions = asyncHandler(async (req, res) => {
    const { courseId, teacherId } = req.params;
    const { permissions } = req.body;

    const course = req.course;

    const courseTeacher = await CourseTeacher.findOne({
        course: courseId,
        teacher: teacherId
    });

    if (!courseTeacher) {
        res.status(404);
        throw new Error('Teacher not found for this course');
    }

    // Only admin or course creator can grant full_access or manage_teachers
    const isAdminOrCreator = req.user.role === 'admin' || course.user.toString() === req.user.id;
    const canGrantFullAccess = isAdminOrCreator;
    const canGrantManageTeachers = isAdminOrCreator;

    // Update permissions
    courseTeacher.permissions = {
        manage_content: permissions?.manage_content ?? courseTeacher.permissions.manage_content,
        manage_students: permissions?.manage_students ?? courseTeacher.permissions.manage_students,
        full_access: canGrantFullAccess ? (permissions?.full_access ?? courseTeacher.permissions.full_access) : courseTeacher.permissions.full_access,
        manage_teachers: canGrantManageTeachers ? (permissions?.manage_teachers ?? courseTeacher.permissions.manage_teachers) : courseTeacher.permissions.manage_teachers
    };

    await courseTeacher.save();

    await courseTeacher.populate('teacher', 'name email');
    await courseTeacher.populate('addedBy', 'name');

    res.status(200).json(courseTeacher);
});

// @desc    Remove teacher from course
// @route   DELETE /api/courses/:courseId/teachers/:teacherId
// @access  Private (Course Owner, Admin, or Teacher with manage_teachers permission)
const removeTeacher = asyncHandler(async (req, res) => {
    const { courseId, teacherId } = req.params;

    const course = req.course;

    // Cannot remove course creator
    if (teacherId === course.user.toString()) {
        res.status(403);
        throw new Error('Cannot remove the course creator');
    }

    const courseTeacher = await CourseTeacher.findOneAndDelete({
        course: courseId,
        teacher: teacherId
    });

    if (!courseTeacher) {
        res.status(404);
        throw new Error('Teacher not found for this course');
    }

    res.status(200).json({ message: 'Teacher removed successfully', teacherId });
});

// @desc    Leave course (teacher removes themselves)
// @route   DELETE /api/courses/:courseId/teachers/leave
// @access  Private (Only the teacher themselves)
const leaveCourse = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const userId = req.user.id;

    const courseTeacher = await CourseTeacher.findOneAndDelete({
        course: courseId,
        teacher: userId
    });

    if (!courseTeacher) {
        res.status(404);
        throw new Error('You are not a teacher for this course');
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
            isTeacher: false,
            permissions: {
                manage_content: true,
                manage_students: true,
                full_access: true,
                manage_teachers: true
            }
        });
    }

    // Check if user is course creator
    if (course.user.toString() === userId) {
        return res.status(200).json({
            isAdmin: false,
            isCreator: true,
            isTeacher: false,
            permissions: {
                manage_content: true,
                manage_students: true,
                full_access: true,
                manage_teachers: true
            }
        });
    }

    // Check if user is a teacher
    const courseTeacher = await CourseTeacher.findOne({
        course: courseId,
        teacher: userId
    });

    if (courseTeacher) {
        return res.status(200).json({
            isAdmin: false,
            isCreator: false,
            isTeacher: true,
            permissions: courseTeacher.permissions
        });
    }

    // User has no special permissions
    res.status(200).json({
        isAdmin: false,
        isCreator: false,
        isTeacher: false,
        permissions: {
            manage_content: false,
            manage_students: false,
            full_access: false,
            manage_teachers: false
        }
    });
});

module.exports = {
    addTeacher,
    getCourseTeachers,
    updateTeacherPermissions,
    removeTeacher,
    leaveCourse,
    getMyPermissions
};
