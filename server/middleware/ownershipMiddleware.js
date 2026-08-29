const asyncHandler = require('express-async-handler');
const Course = require('../models/Course');
const Lecture = require('../models/Lecture');
const Broadcast = require('../models/Broadcast');
const CourseTeacher = require('../models/CourseTeacher');

/**
 * Check if user is admin
 * @param {Object} user - User object from request
 * @returns {boolean}
 */
const isAdmin = (user) => user && user.role === 'admin';

/**
 * Check if user owns the resource
 * @param {string} userId - Current user's ID
 * @param {string} ownerId - Resource owner's ID
 * @returns {boolean}
 */
const isOwner = (userId, ownerId) => {
    return userId && ownerId && userId.toString() === ownerId.toString();
};

/**
 * Check if user can manage resource (is admin OR owner)
 * @param {Object} user - User object
 * @param {string} ownerId - Resource owner's ID
 * @returns {boolean}
 */
const canManage = (user, ownerId) => {
    return isAdmin(user) || isOwner(user?.id || user?._id, ownerId);
};

/**
 * Get teacher permissions for a course
 * @param {string} userId - User's ID
 * @param {string} courseId - Course ID
 * @returns {Object|null} - Permissions object or null if not a teacher
 */
const getTeacherPermissions = async (userId, courseId) => {
    const courseTeacher = await CourseTeacher.findOne({
        course: courseId,
        teacher: userId
    });
    return courseTeacher ? courseTeacher.permissions : null;
};

/**
 * Check if user has specific teacher permission
 * @param {string} userId - User's ID
 * @param {string} courseId - Course ID
 * @param {string} permission - Permission to check (manage_content, manage_students, full_access, manage_teachers)
 * @returns {boolean}
 */
const hasTeacherPermission = async (userId, courseId, permission) => {
    const permissions = await getTeacherPermissions(userId, courseId);
    if (!permissions) return false;
    // full_access grants all permissions
    if (permissions.full_access) return true;
    return !!permissions[permission];
};

/**
 * Check if user can broadcast (is admin OR owner OR student broadcasts allowed)
 * @param {Object} user - User object
 * @param {Object} course - Course object with user and allowStudentBroadcasts fields
 * @param {boolean} isEnrolled - Whether user is enrolled in the course
 * @returns {boolean}
 */
const canBroadcast = (user, course, isEnrolled = false) => {
    if (!user || !course) return false;
    const userId = user?.id || user?._id;
    if (isAdmin(user)) return true;
    if (isOwner(userId, course.user)) return true;
    if (course.allowStudentBroadcasts && isEnrolled) return true;
    return false;
};

/**
 * Middleware: Verify course ownership
 * Allows access if user is admin OR course owner OR teacher with full_access
 * Attaches course to req.course
 */
const verifyCourseOwnership = asyncHandler(async (req, res, next) => {
    const courseId = req.params.id || req.params.courseId;

    if (!courseId) {
        res.status(400);
        throw new Error('Course ID is required');
    }

    const course = await Course.findById(courseId);

    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    const userId = req.user?.id || req.user?._id;

    // Check if admin or owner
    if (canManage(req.user, course.user)) {
        req.course = course;
        req.isOwner = true;
        return next();
    }

    // Check if teacher with full_access permission
    const hasFullAccess = await hasTeacherPermission(userId, courseId, 'full_access');
    if (hasFullAccess) {
        req.course = course;
        req.isOwner = false;
        req.isTeacher = true;
        return next();
    }

    res.status(403);
    throw new Error('Not authorized to access this course');
});

/**
 * Middleware: Verify course content management permission
 * Allows access if user is admin OR course owner OR teacher with manage_content
 * Attaches course to req.course
 */
const verifyCourseContentPermission = asyncHandler(async (req, res, next) => {
    const courseId = req.params.id || req.params.courseId;

    if (!courseId) {
        res.status(400);
        throw new Error('Course ID is required');
    }

    const course = await Course.findById(courseId);

    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    const userId = req.user?.id || req.user?._id;

    // Check if admin or owner
    if (canManage(req.user, course.user)) {
        req.course = course;
        req.isOwner = true;
        return next();
    }

    // Check if teacher with manage_content or full_access permission
    const hasContentAccess = await hasTeacherPermission(userId, courseId, 'manage_content');
    if (hasContentAccess) {
        req.course = course;
        req.isOwner = false;
        req.isTeacher = true;
        return next();
    }

    res.status(403);
    throw new Error('Not authorized to manage course content');
});

/**
 * Middleware: Verify student management permission
 * Allows access if user is admin OR course owner OR teacher with manage_students
 * Attaches course to req.course
 */
const verifyStudentManagementPermission = asyncHandler(async (req, res, next) => {
    const courseId = req.params.id || req.params.courseId;

    if (!courseId) {
        res.status(400);
        throw new Error('Course ID is required');
    }

    const course = await Course.findById(courseId);

    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    const userId = req.user?.id || req.user?._id;

    // Check if admin or owner
    if (canManage(req.user, course.user)) {
        req.course = course;
        req.isOwner = true;
        return next();
    }

    // Check if teacher with manage_students or full_access permission
    const hasStudentAccess = await hasTeacherPermission(userId, courseId, 'manage_students');
    if (hasStudentAccess) {
        req.course = course;
        req.isOwner = false;
        req.isTeacher = true;
        return next();
    }

    res.status(403);
    throw new Error('Not authorized to manage students');
});

/**
 * Middleware: Verify teacher management permission
 * Allows access if user is admin OR course owner OR teacher with manage_teachers
 * Attaches course to req.course
 */
const verifyTeacherManagementPermission = asyncHandler(async (req, res, next) => {
    const courseId = req.params.id || req.params.courseId;

    if (!courseId) {
        res.status(400);
        throw new Error('Course ID is required');
    }

    const course = await Course.findById(courseId);

    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    const userId = req.user?.id || req.user?._id;

    // Check if admin or owner
    if (canManage(req.user, course.user)) {
        req.course = course;
        req.isOwner = true;
        return next();
    }

    // Check if teacher with manage_teachers or full_access permission
    const hasTeacherAccess = await hasTeacherPermission(userId, courseId, 'manage_teachers');
    if (hasTeacherAccess) {
        req.course = course;
        req.isOwner = false;
        req.isTeacher = true;
        return next();
    }

    res.status(403);
    throw new Error('Not authorized to manage teachers');
});

/**
 * Middleware: Verify any course access (owner or any teacher)
 * Allows access if user is admin OR course owner OR any assigned teacher
 * Attaches course to req.course
 */
const verifyCourseAccess = asyncHandler(async (req, res, next) => {
    const courseId = req.params.id || req.params.courseId;

    if (!courseId) {
        res.status(400);
        throw new Error('Course ID is required');
    }

    const course = await Course.findById(courseId);

    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    const userId = req.user?.id || req.user?._id;

    // Check if admin or owner
    if (canManage(req.user, course.user)) {
        req.course = course;
        req.isOwner = true;
        return next();
    }

    // Check if any teacher
    const permissions = await getTeacherPermissions(userId, courseId);
    if (permissions) {
        req.course = course;
        req.isOwner = false;
        req.isTeacher = true;
        req.teacherPermissions = permissions;
        return next();
    }

    res.status(403);
    throw new Error('Not authorized to access this course');
});

/**
 * Middleware: Verify lecture ownership (via course)
 * Allows access if user is admin OR owns the course containing the lecture
 * Attaches lecture and course to req
 */
const verifyLectureOwnership = asyncHandler(async (req, res, next) => {
    const lectureId = req.params.id || req.params.lectureId;

    if (!lectureId) {
        res.status(400);
        throw new Error('Lecture ID is required');
    }

    const lecture = await Lecture.findById(lectureId);

    if (!lecture) {
        res.status(404);
        throw new Error('Lecture not found');
    }

    const course = await Course.findById(lecture.course);

    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    if (!canManage(req.user, course.user)) {
        res.status(403);
        throw new Error('Not authorized to access this lecture');
    }

    req.lecture = lecture;
    req.course = course;
    next();
});

/**
 * Middleware: Verify broadcast permission (via course)
 * Allows access if user is admin OR owner OR teacher OR (student broadcasts allowed AND enrolled)
 * Attaches course to req.course
 */
const verifyBroadcastPermission = asyncHandler(async (req, res, next) => {
    const courseId = req.params.id || req.params.courseId;

    if (!courseId) {
        res.status(400);
        throw new Error('Course ID is required');
    }

    const course = await Course.findById(courseId);

    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    const userId = req.user?.id || req.user?._id;

    // Check if admin or owner
    if (canManage(req.user, course.user)) {
        req.course = course;
        req.isOwner = true;
        return next();
    }

    // Check if teacher (any assigned teacher can view/create broadcasts)
    const teacherPermissions = await getTeacherPermissions(userId, courseId);
    if (teacherPermissions) {
        req.course = course;
        req.isOwner = false;
        req.isTeacher = true;
        req.teacherPermissions = teacherPermissions;
        return next();
    }

    // Check if user is enrolled (for student broadcast permission)
    const Progress = require('../models/Progress');
    const isEnrolled = await Progress.exists({ student: userId, course: courseId });

    if (course.allowStudentBroadcasts && isEnrolled) {
        req.course = course;
        req.isOwner = false;
        req.isTeacher = false;
        return next();
    }

    res.status(403);
    throw new Error('Not authorized to broadcast in this course');
});

/**
 * Middleware: Verify broadcast ownership (via course)
 * Allows access if user is admin OR owns the course OR created the broadcast
 * Attaches broadcast and course to req
 */
const verifyBroadcastOwnership = asyncHandler(async (req, res, next) => {
    const broadcastId = req.params.id || req.params.broadcastId;

    if (!broadcastId) {
        res.status(400);
        throw new Error('Broadcast ID is required');
    }

    const broadcast = await Broadcast.findById(broadcastId);

    if (!broadcast) {
        res.status(404);
        throw new Error('Broadcast not found');
    }

    const course = await Course.findById(broadcast.course);

    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    const userId = req.user?.id || req.user?._id;
    const isCreator = broadcast.createdBy && broadcast.createdBy.toString() === userId.toString();

    // Allow if admin, course owner, or broadcast creator
    if (!canManage(req.user, course.user) && !isCreator) {
        res.status(403);
        throw new Error('Not authorized to access this broadcast');
    }

    req.broadcast = broadcast;
    req.course = course;
    next();
});

module.exports = {
    isAdmin,
    isOwner,
    canManage,
    canBroadcast,
    getTeacherPermissions,
    hasTeacherPermission,
    verifyCourseOwnership,
    verifyCourseContentPermission,
    verifyStudentManagementPermission,
    verifyTeacherManagementPermission,
    verifyCourseAccess,
    verifyLectureOwnership,
    verifyBroadcastPermission,
    verifyBroadcastOwnership
};
