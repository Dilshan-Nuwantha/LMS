const asyncHandler = require('express-async-handler');
const Course = require('../models/Course');
const Lecture = require('../models/Lecture');
const User = require('../models/User');
const Progress = require('../models/Progress');
const Activity = require('../models/Activity');
const QuizAttempt = require('../models/QuizAttempt');
const Quiz = require('../models/Quiz');
const CourseTeacher = require('../models/CourseTeacher');
const { canManage, getTeacherPermissions } = require('../middleware/ownershipMiddleware');

// @desc    Create new course
// @route   POST /api/courses
// @access  Private (any authenticated user)
const createCourse = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    if (!title || !description) {
        res.status(400);
        throw new Error('Please add all fields');
    }

    const course = await Course.create({
        user: req.user.id,
        title,
        description,
        sections: [],
        lectureStatuses: [
            { label: 'Not Started', color: '#64748b' },
            { label: 'In Progress', color: '#f59e0b' },
            { label: 'Completed', color: '#10b981' }
        ],
        completedStatus: 'Completed'
    });

    res.status(201).json(course);
});

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private (Admin or Course Owner)
const updateCourse = asyncHandler(async (req, res) => {
    const { title, description, status, lectureStatuses } = req.body;

    // Course is attached by verifyCourseOwnership middleware
    const course = req.course;

    course.title = title || course.title;
    course.description = description || course.description;
    course.status = status || course.status;
    course.lectureStatuses = lectureStatuses !== undefined ? lectureStatuses : course.lectureStatuses;
    course.completedStatus = req.body.completedStatus || course.completedStatus;

    // Marketplace fields
    if (req.body.isMarketplace !== undefined) course.isMarketplace = req.body.isMarketplace;
    if (req.body.price !== undefined) course.price = req.body.price;
    if (req.body.originalPrice !== undefined) course.originalPrice = req.body.originalPrice;
    if (req.body.currency !== undefined) course.currency = req.body.currency;
    if (req.body.category !== undefined) course.category = req.body.category;
    if (req.body.level !== undefined) course.level = req.body.level;
    if (req.body.thumbnail !== undefined) course.thumbnail = req.body.thumbnail;
    if (req.body.tags !== undefined) course.tags = req.body.tags;
    if (req.body.requirements !== undefined) course.requirements = req.body.requirements;
    if (req.body.whatYouWillLearn !== undefined) course.whatYouWillLearn = req.body.whatYouWillLearn;
    if (req.body.allowPeerProgress !== undefined) course.allowPeerProgress = req.body.allowPeerProgress;
    if (req.body.notificationSettings !== undefined) {
        course.notificationSettings = { ...course.notificationSettings?.toObject?.() || {}, ...req.body.notificationSettings };
    }

    await course.save();

    // Return only the updated fields, not the full course with sections
    const { sections, ...courseWithoutSections } = course.toObject();
    res.status(200).json(courseWithoutSections);
});

// @desc    Get all courses
// @route   GET /api/courses
// @access  Private
const getCourses = asyncHandler(async (req, res) => {
    const courses = await Course.find();
    res.status(200).json(courses);
});

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Private
const getCourse = asyncHandler(async (req, res) => {
    const courseDoc = await Course.findById(req.params.id)
        .populate({
            path: 'sections.lectures',
            model: 'Lecture'
        });

    if (!courseDoc) {
        res.status(404);
        throw new Error('Course not found');
    }

    let course = courseDoc.toObject();

    if (!course.lectureStatuses || course.lectureStatuses.length === 0) {
        course.lectureStatuses = [
            { label: 'Not Started', color: '#64748b' },
            { label: 'In Progress', color: '#f59e0b' },
            { label: 'Completed', color: '#10b981' }
        ];
    }

    const userId = req.user?.id || req.user?._id;
    const isOwnerOrAdmin = canManage(req.user, course.user);

    // Check if user is a teacher
    const teacherPermissions = await getTeacherPermissions(userId, req.params.id);
    const isTeacher = !!teacherPermissions;
    const hasFullAccess = teacherPermissions?.full_access || teacherPermissions?.manage_content;

    // Filter hidden content for non-owners and non-teachers
    if (!isOwnerOrAdmin && !hasFullAccess) {
        course.sections = course.sections
            .filter(section => section.isPublic)
            .map(section => ({
                ...section,
                lectures: section.lectures.filter(lecture => lecture.isPublic)
            }));
    }

    // Add user role info
    if (isOwnerOrAdmin) {
        course.userRole = req.user.role === 'admin' ? 'admin' : 'owner';
    } else if (isTeacher) {
        course.userRole = 'teacher';
        course.permissions = teacherPermissions;
    } else {
        course.userRole = 'student';
    }

    res.status(200).json(course);
});

// @desc    Add section to course
// @route   POST /api/courses/:id/sections
// @access  Private (Admin or Course Owner)
const addSection = asyncHandler(async (req, res) => {
    const { title } = req.body;

    // Course is attached by verifyCourseOwnership middleware
    const course = req.course;

    course.sections.push({ title, isPublic: req.body.isPublic, isPreview: req.body.isPreview, importance: req.body.importance || '', lectures: [] });
    await course.save();

    // Notification trigger: new content
    if (course.notificationSettings?.newContent) {
        const { notifyCourseStudents } = require('./notificationController');
        notifyCourseStudents(course._id, {
            title: `New Section: ${title}`,
            message: `A new section "${title}" was added to "${course.title}"`,
            type: 'new_content',
            link: `/course/${course._id}`
        });
    }

    res.status(201).json(course);
});

// @desc    Update section
// @route   PUT /api/courses/:id/sections/:sectionId
// @access  Private (Admin or Course Owner)
const updateSection = asyncHandler(async (req, res) => {
    const { title } = req.body;

    // Course is attached by verifyCourseOwnership middleware
    const course = req.course;

    const section = course.sections.id(req.params.sectionId);
    if (!section) {
        res.status(404);
        throw new Error('Section not found');
    }

    section.title = title || section.title;
    if (req.body.isPublic !== undefined) {
        section.isPublic = req.body.isPublic;
    }
    if (req.body.isPreview !== undefined) {
        section.isPreview = req.body.isPreview;
    }
    if (req.body.importance !== undefined) {
        section.importance = req.body.importance;
    }
    await course.save();

    res.status(200).json(course);
});

// @desc    Delete section
// @route   DELETE /api/courses/:id/sections/:sectionId
// @access  Private (Admin or Course Owner)
const deleteSection = asyncHandler(async (req, res) => {
    // Course is attached by verifyCourseOwnership middleware
    const course = req.course;

    const section = course.sections.id(req.params.sectionId);
    if (!section) {
        res.status(404);
        throw new Error('Section not found');
    }

    // Delete all lectures in this section
    if (section.lectures && section.lectures.length > 0) {
        await Lecture.deleteMany({ _id: { $in: section.lectures } });
    }

    // Remove section from course
    course.sections.pull(req.params.sectionId);
    await course.save();

    res.status(200).json({ id: req.params.sectionId });
});

// @desc    Add lecture to course section
// @route   POST /api/courses/:id/sections/:sectionId/lectures
// @access  Private (Admin or Course Owner)
const addLectureToSection = asyncHandler(async (req, res) => {
    const { title, number, resourceUrl, description, dueDate } = req.body;
    const { id, sectionId } = req.params;

    // Course is attached by verifyCourseOwnership middleware
    const course = req.course;

    const section = course.sections.id(sectionId);
    if (!section) {
        res.status(404);
        throw new Error('Section not found');
    }

    // Create Lecture
    const lecture = await Lecture.create({
        course: id,
        title,
        number,
        resourceUrl,
        description,
        dueDate,
        status: req.body.status || 'Pending',
        isPublic: req.body.isPublic !== undefined ? req.body.isPublic : false,
        isPreview: req.body.isPreview !== undefined ? req.body.isPreview : false,
        importance: req.body.importance || ''
    });

    // Add to section
    section.lectures.push(lecture._id);
    await course.save();

    // Notification trigger: new content
    if (course.notificationSettings?.newContent) {
        const { notifyCourseStudents } = require('./notificationController');
        notifyCourseStudents(course._id, {
            title: `New Lecture: ${lecture.title}`,
            message: `A new lecture "${lecture.title}" was added to "${course.title}"`,
            type: 'new_content',
            link: `/course/${course._id}/lecture/${lecture._id}`
        });
    }

    res.status(201).json(lecture);
});

// @desc    Update lecture
// @route   PUT /api/courses/lectures/:id
// @access  Private (Admin or Course Owner)
const updateLecture = asyncHandler(async (req, res) => {
    const { title, resourceUrl, description, dueDate } = req.body;

    // Lecture and course are attached by verifyLectureOwnership middleware
    const lecture = req.lecture;

    lecture.title = title || lecture.title;
    lecture.resourceUrl = resourceUrl || lecture.resourceUrl;
    lecture.description = description || lecture.description;
    lecture.dueDate = dueDate || lecture.dueDate;
    lecture.status = req.body.status || lecture.status;
    if (req.body.isPublic !== undefined) {
        lecture.isPublic = req.body.isPublic;
    }
    if (req.body.isPreview !== undefined) {
        lecture.isPreview = req.body.isPreview;
    }
    if (req.body.importance !== undefined) {
        lecture.importance = req.body.importance;
    }

    await lecture.save();
    res.status(200).json(lecture);
});

// @desc    Delete lecture
// @route   DELETE /api/courses/lectures/:id
// @access  Private (Admin or Course Owner)
const deleteLecture = asyncHandler(async (req, res) => {
    // Lecture and course are attached by verifyLectureOwnership middleware
    const lecture = req.lecture;
    const course = req.course;

    // Find which section has this lecture and remove it
    course.sections.forEach(section => {
        const idx = section.lectures.indexOf(lecture._id);
        if (idx > -1) {
            section.lectures.splice(idx, 1);
        }
    });
    await course.save();

    // Delete the lecture document
    await lecture.deleteOne();

    res.status(200).json({ id: req.params.id });
});

// @desc    Enroll student in course
// @route   POST /api/courses/:id/enroll
// @access  Private (Admin or Course Owner)
const enrollStudent = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const courseId = req.params.id;

    const user = await User.findOne({ email });
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Course is attached by verifyCourseOwnership middleware
    const course = req.course;

    const progressExists = await Progress.findOne({ student: user._id, course: courseId });
    if (progressExists) {
        res.status(400);
        throw new Error('Student already enrolled');
    }

    const progress = await Progress.create({
        student: user._id,
        course: courseId,
        completedLectures: []
    });

    res.status(201).json(progress);

    // Log Activity
    await Activity.create({
        student: user._id,
        course: courseId,
        action: 'Enrolled',
        details: `Enrolled in ${course.title}`
    });
});

// @desc    Get enrolled courses for current user (optimized - only returns counts, not full lecture data)
// @route   GET /api/courses/my/enrolled
// @access  Private
const getEnrolledCourses = asyncHandler(async (req, res) => {
    const progresses = await Progress.find({ student: req.user.id })
        .populate({
            path: 'course',
            select: 'title description status completedStatus sections thumbnail'
        });

    // Only show Published courses to students (hide Draft and Archived)
    const publishedProgresses = progresses.filter(progress =>
        progress.course && progress.course.status === 'Published'
    );

    // Transform data to include lecture counts instead of full lecture data
    const optimizedProgresses = publishedProgresses.map(progress => {
        const course = progress.course;
        let totalLectures = 0;
        const visibleLectureIds = new Set();

        if (course.sections) {
            course.sections.forEach(section => {
                if (section.isPublic !== false) {
                    section.lectures?.forEach(lec => {
                        if (lec.isPublic !== false) {
                            visibleLectureIds.add(lec._id.toString());
                            totalLectures++;
                        }
                    });
                }
            });
        }

        const filteredCompletedLectures = progress.completedLectures.filter(
            l => visibleLectureIds.has(l.lecture.toString())
        );

        return {
            _id: progress._id,
            completedLectures: filteredCompletedLectures,
            course: {
                _id: course._id,
                title: course.title,
                description: course.description,
                status: course.status,
                completedStatus: course.completedStatus,
                thumbnail: course.thumbnail,
                totalLectures // Pre-computed count
            }
        };
    });

    res.status(200).json(optimizedProgresses);
});

// @desc    Get current user's progress for a specific course
// @route   GET /api/courses/:id/my-progress
// @access  Private
const getMyProgress = asyncHandler(async (req, res) => {
    const progress = await Progress.findOne({
        student: req.user.id,
        course: req.params.id
    });

    if (!progress) {
        return res.status(200).json({ enrolled: false, completedLectures: [] });
    }

    res.status(200).json({
        _id: progress._id,
        completedLectures: progress.completedLectures
    });
});

// @desc    Get single lecture
// @route   GET /api/courses/lectures/:id
// @access  Private
const getLecture = asyncHandler(async (req, res) => {
    const lecture = await Lecture.findById(req.params.id);
    if (!lecture) {
        res.status(404);
        throw new Error('Lecture not found');
    }

    const userId = req.user?.id || req.user?._id;
    const course = await Course.findById(lecture.course);
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    const isOwnerOrAdmin = canManage(req.user, course.user);
    const teacherPermissions = await getTeacherPermissions(userId, course._id);
    const isTeacher = !!teacherPermissions;

    // If lecture or its section is hidden, only owner/admin/teacher can access
    if (!isOwnerOrAdmin && !isTeacher) {
        if (!lecture.isPublic) {
            res.status(403);
            throw new Error('This lecture is not available');
        }

        // Check if parent section is hidden
        const section = course.sections.find(s =>
            s.lectures.some(l => l.toString() === lecture._id.toString())
        );
        if (section && !section.isPublic) {
            res.status(403);
            throw new Error('This lecture is not available');
        }

        // Check if lecture is preview-only (for non-enrolled users)
        if (!lecture.isPreview) {
            const progress = await Progress.findOne({ student: userId, course: course._id });
            if (!progress) {
                res.status(403);
                throw new Error('You must be enrolled to view this lecture');
            }
        }
    }

    res.status(200).json(lecture);
});

// @desc    Update lecture progress
// @route   PUT /api/courses/lectures/:id/progress
// @access  Private
const updateLectureProgress = asyncHandler(async (req, res) => {
    const lectureId = req.params.id;
    const { status, notes, courseId } = req.body;

    let targetCourseId;
    let lectureTitle = 'Unknown Lecture';

    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
        res.status(404);
        throw new Error('Lecture not found');
    }
    targetCourseId = lecture.course;
    lectureTitle = lecture.title;

    let progress = await Progress.findOne({ student: req.user.id, course: targetCourseId });

    if (!progress) {
        res.status(404);
        throw new Error('Not enrolled in this course');
    }

    const lectureIndex = progress.completedLectures.findIndex(
        (item) => item.lecture.toString() === lectureId
    );

    let previousStatus = 'Not Started';
    let previousNotes = '';

    if (lectureIndex > -1) {
        previousStatus = progress.completedLectures[lectureIndex].status;
        previousNotes = progress.completedLectures[lectureIndex].notes || '';

        progress.completedLectures[lectureIndex].status = status || progress.completedLectures[lectureIndex].status;
        progress.completedLectures[lectureIndex].notes = notes !== undefined ? notes : progress.completedLectures[lectureIndex].notes;
        progress.completedLectures[lectureIndex].completedAt = Date.now();
    } else {
        progress.completedLectures.push({
            lecture: lectureId,
            status: status || 'Pending',
            notes: notes || '',
            completedAt: Date.now()
        });
    }

    await progress.save();

    // Prepare Activity Log Context for Middleware
    if (status && status !== previousStatus) {
        const course = await Course.findById(targetCourseId);
        const completionLabel = course?.completedStatus || 'Completed';

        let action = 'In Progress';
        if (status === completionLabel) action = 'Completed';
        else if (previousStatus === 'Not Started' && status !== 'Not Started') action = 'Started';

        // We can pass multiple activities? Middleware only handles one per request usually.
        // But here we might have Note AND Status update.
        // Option: Send array or handle primary?
        // Let's stick to valid single action rule or direct create if complex?
        // Actually, preventing middleware from logging generic if we do explicit?
        // User said "not to add everywhere".
        // But middleware supports override.

        // Let's use res.locals.activity for the PRIMARY action.
        res.locals.activity = {
            course: targetCourseId,
            lecture: lectureId,
            action: action,
            details: `Updated status to ${status} for ${lectureTitle}`
        };

        // If we also have notes, we might lose one log?
        // If BOTH happen, we need 2 logs.
        // Middleware handles 1.
        // Exception: For multi-log events, we might still need manual create?
        // OR we make middleware handle array.
    }

    if (notes !== undefined && notes !== previousNotes) {
        // If we already set activity (Status Update), we adding a second one?
        if (res.locals.activity) {
            // We have a prior activity. We should log the note separately directly?
            // This is the edge case.
            // Let's manually create the Note log to avoid complexity in middleware for now,
            // OR define res.locals.activities = []
            await Activity.create({
                user: req.user.id,
                course: targetCourseId,
                lecture: lectureId,
                action: 'Note Updated',
                method: req.method,
                details: `Updated notes for ${lectureTitle}: "${notes}"`
            });
        } else {
            res.locals.activity = {
                course: targetCourseId,
                action: 'Note Updated',
                details: `Updated notes for ${lectureTitle}: "${notes}"`
            };
        }
    }

    res.status(200).json(progress);
});

// @desc    Add a comment to a lecture
// @route   POST /api/courses/lectures/:id/comments
// @access  Private
const addComment = asyncHandler(async (req, res) => {
    const lectureId = req.params.id;
    const { content, courseId } = req.body;

    // Use middleware for logging -> automatic if we set nothing?
    // Middleware detects '/comments' in URL and sets 'Comment' action.
    // We just need to ensure req.body has info. 
    // It does.
    // So we can Remove explicit Activity.create! 
    // BUT we need to return the activity? 
    // The controller returns `res.status(201).json(activity)`.
    // If we rely on middleware, we don't have the activity object yet (it's created on finish).
    // Frontend expects current comment to append to list?
    // CourseView.jsx: `setComments(res.data)`. NO!
    // `handleAddComment`: `fetchComments` called after success.
    // So frontend refreshes list. We don't need to return the specific activity object!
    // We can return simple success message or just status.

    // However, if we want to return it immediately, we must create it immediately.
    // Middleware creates it AFTER response.
    // Browser receives response -> calls Log.
    // Then browser calls `fetchComments`.
    // Race condition?
    // DB write might be slower than network?
    // Usually DB write in middleware is async. Response finished.
    // Browser gets 201. Requests GET /comments.
    // If middleware hasn't finished writing, GET returns old list.

    // CRITICAL: For comments, manual creation is better for consistency?
    // OR await the activity creation?
    // Use `res.locals.activity`... middleware awaits it? 
    // Middleware is separate.

    // User restriction: "check if it is not GET request then add in activity".
    // "track this helps us to track activity in 1 file".

    // I will use Manual Create for Comment to ensure it exists before returning (to avoid race condition),
    // AND set `res.locals.activity.skip = true` to prevent middleware from double logging.

    const activity = await Activity.create({
        user: req.user.id,
        // student: req.user.id, // Optional: Save both for double safety locally during migration? No, let's stick to user.
        course: courseId,
        lecture: lectureId,
        action: 'Comment',
        method: req.method,
        url: req.originalUrl,
        data: req.body,
        details: content
    });

    res.locals.activity = { skip: true }; // Tell middleware we handled it

    res.status(201).json(activity);
});

// @desc    Get comments for a lecture (Current User)
// @route   GET /api/courses/lectures/:id/comments
// @access  Private
const getLectureComments = asyncHandler(async (req, res) => {
    const { id } = req.params; // Lecture ID

    // Fetch activities for this lecture that are comments
    // Populate 'user' (new field) OR 'student' (old field) to support both if needed,
    // but since we migrated, we use 'user'.
    const comments = await Activity.find({
        lecture: id,
        action: 'Comment'
    })
        .populate('user', 'name') // Changed from student to user
        .populate('student', 'name') // Fallback if old valid
        .sort({ createdAt: -1 });

    res.json(comments);
});

// @desc    Get student activity for a course
// @route   GET /api/courses/:id/activity/:studentId
// @access  Private (Admin or Course Owner)
const getStudentActivity = asyncHandler(async (req, res) => {
    const { id, studentId } = req.params;
    const { page = 1, limit = 15 } = req.query;

    // Fetch student details
    const student = await User.findById(studentId).select('name email role');
    if (!student) {
        res.status(404);
        throw new Error('Student not found');
    }

    // Build query - filter out personal notes (Note Updated action)
    // Teachers should not see student's personal notes
    const query = {
        course: id,
        user: studentId,
        action: { $ne: 'Note Updated' } // Exclude personal notes
    };

    // Count total for pagination
    const total = await Activity.countDocuments(query);
    const pages = Math.ceil(total / parseInt(limit));

    // Query using 'user' field (activities are logged with user, not student)
    const activities = await Activity.find(query)
        .populate('lecture', 'title number')
        .populate('user', 'name email role')
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit));

    res.status(200).json({
        student,
        activities,
        page: parseInt(page),
        pages,
        total
    });
});

// @desc    Get all progresses for a course
// @route   GET /api/courses/:id/progresses
// @access  Private (Admin or Course Owner)
const getCourseProgresses = asyncHandler(async (req, res) => {
    const { keyword, page, limit } = req.query;

    let query = { course: req.params.id };

    if (keyword) {
        const users = await User.find({
            $or: [
                { name: { $regex: keyword, $options: 'i' } },
                { email: { $regex: keyword, $options: 'i' } }
            ]
        }).select('_id');
        const userIds = users.map(u => u._id);
        query.student = { $in: userIds };
    }

    if (page && limit) {
        const count = await Progress.countDocuments(query);
        const progresses = await Progress.find(query)
            .populate('student', 'name email')
            .limit(Number(limit))
            .skip(Number(limit) * (Number(page) - 1));

        res.status(200).json({
            progresses,
            page: Number(page),
            pages: Math.ceil(count / Number(limit)),
            total: count
        });
    } else {
        const progresses = await Progress.find(query)
            .populate('student', 'name email');
        res.status(200).json(progresses);
    }
});

// @desc    Get enrolled student list (lightweight, no progress data)
// @route   GET /api/courses/:id/enrolled-students
// @access  Private (Admin or Course Owner)
const getEnrolledStudentList = asyncHandler(async (req, res) => {
    const { keyword } = req.query;

    let query = { course: req.params.id };

    if (keyword) {
        const users = await User.find({
            $or: [
                { name: { $regex: keyword, $options: 'i' } },
                { email: { $regex: keyword, $options: 'i' } }
            ]
        }).select('_id');
        query.student = { $in: users.map(u => u._id) };
    }

    const limit = Math.min(Number(req.query.limit) || 10, 50);

    const students = await Progress.find(query)
        .select('student')
        .populate('student', 'name email')
        .limit(limit)
        .lean();

    res.status(200).json(students.map(s => ({
        _id: s.student._id,
        name: s.student.name,
        email: s.student.email
    })));
});

// @desc    Get peer student list for a course (student-facing, requires allowPeerProgress)
// @route   GET /api/courses/:id/peers
// @access  Private (enrolled students only)
const getPeerStudentList = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id).select('allowPeerProgress');
    if (!course) { res.status(404); throw new Error('Course not found'); }
    if (!course.allowPeerProgress) { res.status(403); throw new Error('Peer progress viewing is not enabled for this course'); }

    // Check if requester is enrolled
    const isEnrolled = await Progress.findOne({ course: req.params.id, student: req.user.id });
    if (!isEnrolled) { res.status(403); throw new Error('You are not enrolled in this course'); }

    const { keyword } = req.query;
    let query = { course: req.params.id };

    if (keyword) {
        const users = await User.find({
            $or: [
                { name: { $regex: keyword, $options: 'i' } },
                { email: { $regex: keyword, $options: 'i' } }
            ]
        }).select('_id');
        query.student = { $in: users.map(u => u._id) };
    }

    const limit = Math.min(Number(req.query.limit) || 10, 50);

    const students = await Progress.find(query)
        .select('student')
        .populate('student', 'name email')
        .limit(limit)
        .lean();

    res.status(200).json(students.map(s => ({
        _id: s.student._id,
        name: s.student.name,
        email: s.student.email
    })));
});

// @desc    Get peer student progress detail (student-facing, requires allowPeerProgress)
// @route   GET /api/courses/:id/peers/:studentId/progress
// @access  Private (enrolled students only)
const getPeerStudentProgress = asyncHandler(async (req, res) => {
    const { id, studentId } = req.params;

    const course = await Course.findById(id)
        .select('allowPeerProgress sections title lectureStatuses completedStatus')
        .populate({ path: 'sections.lectures', select: 'title number' });
    if (!course) { res.status(404); throw new Error('Course not found'); }
    if (!course.allowPeerProgress) { res.status(403); throw new Error('Peer progress viewing is not enabled'); }

    // Check if requester is enrolled
    const isEnrolled = await Progress.findOne({ course: id, student: req.user.id });
    if (!isEnrolled) { res.status(403); throw new Error('You are not enrolled in this course'); }

    const student = await User.findById(studentId).select('name email');
    if (!student) { res.status(404); throw new Error('Student not found'); }

    const progress = await Progress.findOne({ course: id, student: studentId });
    if (!progress) { res.status(404); throw new Error('Student is not enrolled'); }

    const lectureProgressMap = new Map();
    progress.completedLectures.forEach(lp => {
        lectureProgressMap.set(lp.lecture.toString(), { status: lp.status, completedAt: lp.completedAt });
    });

    let totalLectures = 0, completedLectures = 0;
    const completedStatus = course.completedStatus || 'Completed';

    const sectionsProgress = course.sections
        .filter(section => section.isPublic !== false)
        .map((section, si) => {
            const lectures = section.lectures.filter(lec => lec.isPublic !== false).map((lec, li) => {
                totalLectures++;
                const lp = lectureProgressMap.get(lec._id.toString());
                const status = lp ? lp.status : 'Not Started';
                if (status === completedStatus) completedLectures++;
                return { _id: lec._id, title: lec.title, number: lec.number || li + 1, status, statusDate: lp?.completedAt || null };
            });
            const sectionCompleted = lectures.filter(l => l.status === completedStatus).length;
            return {
                _id: section._id, title: section.title, sectionNumber: si + 1,
                lectures, completedCount: sectionCompleted, totalCount: lectures.length,
                progressPercent: lectures.length > 0 ? Math.round((sectionCompleted / lectures.length) * 100) : 0
            };
        });

    res.status(200).json({
        student: { _id: student._id, name: student.name, email: student.email },
        course: { _id: course._id, title: course.title, lectureStatuses: course.lectureStatuses },
        progress: { completedLectures, totalLectures, progressPercent: totalLectures > 0 ? Math.round((completedLectures / totalLectures) * 100) : 0 },
        sections: sectionsProgress
    });
});

// @desc    Get user stats (completed lectures count)
// @route   GET /api/courses/my/stats
// @access  Private
const getUserStats = asyncHandler(async (req, res) => {
    // 1. Total Completed Lectures (from Progress)
    const progresses = await Progress.find({ student: req.user.id });
    let totalCompletedLectures = 0;
    progresses.forEach(p => {
        if (p.completedLectures) {
            totalCompletedLectures += p.completedLectures.filter(l => l.status === 'Completed').length;
        }
    });

    // 2. Daily Activity & Streaks (from Activity Logs)
    // We only care about 'Completed' actions for streaks/consistency
    const activities = await Activity.find({
        student: req.user.id,
        action: 'Completed'
    }).sort({ createdAt: 1 });

    // Group by Date (YYYY-MM-DD) and count unique lectures
    const activityMap = {}; // { '2023-10-25': Set { lectureId1, lectureId2 } }
    activities.forEach(act => {
        if (!act.lecture) return;
        const dateStr = act.createdAt.toISOString().split('T')[0];
        if (!activityMap[dateStr]) {
            activityMap[dateStr] = new Set();
        }
        activityMap[dateStr].add(act.lecture.toString());
    });

    // Convert Sets to counts for the frontend
    const finalActivityMap = {};
    Object.keys(activityMap).forEach(date => {
        finalActivityMap[date] = activityMap[date].size;
    });

    const dates = Object.keys(finalActivityMap).sort();

    let currentStreak = 0;
    let maxStreak = 0;

    if (dates.length > 0) {
        // Calculate Max Streak
        let tempStreak = 1;
        maxStreak = 1;

        for (let i = 1; i < dates.length; i++) {
            const prevDate = new Date(dates[i - 1]);
            const currDate = new Date(dates[i]);
            const diffTime = Math.abs(currDate - prevDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                tempStreak++;
            } else {
                tempStreak = 1;
            }
            if (tempStreak > maxStreak) maxStreak = tempStreak;
        }

        // Calculate Current Streak
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        const lastActiveDate = dates[dates.length - 1];

        if (lastActiveDate === today || lastActiveDate === yesterday) {
            // Traverse backwards from lastActiveDate to find streak
            let streak = 1;
            for (let i = dates.length - 1; i > 0; i--) {
                const prevDate = new Date(dates[i - 1]);
                const currDate = new Date(dates[i]);
                const diffTime = Math.abs(currDate - prevDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    streak++;
                } else {
                    break;
                }
            }
            currentStreak = streak;
        } else {
            currentStreak = 0;
        }
    }

    res.status(200).json({
        totalCompletedLectures,
        currentStreak,
        maxStreak,
        dailyActivity: finalActivityMap
    });
});

// @desc    Remove student from course
// @route   DELETE /api/courses/:id/enroll/:studentId
// @access  Private (Admin or Course Owner)
const removeStudent = asyncHandler(async (req, res) => {
    const { id, studentId } = req.params;

    const progress = await Progress.findOneAndDelete({ course: id, student: studentId });

    if (!progress) {
        res.status(404);
        throw new Error('Student not enrolled');
    }

    res.status(200).json({ message: 'Student removed' });
});

// @desc    Get courses created by current user OR where user is a teacher (optimized)
// @route   GET /api/courses/my/created
// @access  Private
const getCreatedCourses = asyncHandler(async (req, res) => {
    // Get courses created by user (only select necessary fields)
    const ownedCourses = await Course.find({ user: req.user.id })
        .select('title description status sections createdAt thumbnail')
        .sort({ createdAt: -1 });

    // Get courses where user is a teacher
    const teacherAssignments = await CourseTeacher.find({ teacher: req.user.id });
    const teacherCourseIds = teacherAssignments.map(t => t.course);

    const teachingCourses = await Course.find({ _id: { $in: teacherCourseIds } })
        .select('title description status sections createdAt thumbnail')
        .sort({ createdAt: -1 });

    // Get all course IDs to fetch student counts
    const allCourseIds = [
        ...ownedCourses.map(c => c._id),
        ...teachingCourses.map(c => c._id)
    ];

    // Get student counts for all courses in one query
    const studentCounts = await Progress.aggregate([
        { $match: { course: { $in: allCourseIds } } },
        { $group: { _id: '$course', count: { $sum: 1 } } }
    ]);
    const studentCountMap = studentCounts.reduce((acc, item) => {
        acc[item._id.toString()] = item.count;
        return acc;
    }, {});

    // Combine and mark courses with role info (calculate counts, don't send full lecture data)
    const ownedWithRole = ownedCourses.map(c => {
        const courseObj = c.toObject();
        const totalLectures = courseObj.sections?.reduce((acc, sec) => acc + (sec.lectures?.length || 0), 0) || 0;
        const sectionCount = courseObj.sections?.length || 0;
        const studentCount = studentCountMap[courseObj._id.toString()] || 0;

        return {
            _id: courseObj._id,
            title: courseObj.title,
            description: courseObj.description,
            status: courseObj.status,
            createdAt: courseObj.createdAt,
            thumbnail: courseObj.thumbnail,
            totalLectures,
            sectionCount,
            studentCount,
            userRole: 'owner'
        };
    });

    const teachingWithRole = teachingCourses.map(c => {
        const courseObj = c.toObject();
        const assignment = teacherAssignments.find(t => t.course.toString() === c._id.toString());
        const totalLectures = courseObj.sections?.reduce((acc, sec) => acc + (sec.lectures?.length || 0), 0) || 0;
        const sectionCount = courseObj.sections?.length || 0;
        const studentCount = studentCountMap[courseObj._id.toString()] || 0;

        return {
            _id: courseObj._id,
            title: courseObj.title,
            description: courseObj.description,
            status: courseObj.status,
            createdAt: courseObj.createdAt,
            thumbnail: courseObj.thumbnail,
            totalLectures,
            sectionCount,
            studentCount,
            userRole: 'teacher',
            permissions: assignment ? assignment.permissions : {}
        };
    });

    // Combine and sort by createdAt
    const allCourses = [...ownedWithRole, ...teachingWithRole].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.status(200).json(allCourses);
});

// @desc    Get course analytics
// @route   GET /api/courses/:id/analytics
// @access  Private (Admin or Course Owner/Teacher)
const getCourseAnalytics = asyncHandler(async (req, res) => {
    const courseId = req.params.id;

    // Get course with sections and lectures
    const course = await Course.findById(courseId).populate({
        path: 'sections.lectures',
        select: 'title number'
    });

    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    // Calculate total lectures
    const totalLectures = course.sections?.reduce((acc, sec) => acc + (sec.lectures?.length || 0), 0) || 0;

    // Get all progress records for this course
    const progresses = await Progress.find({ course: courseId })
        .populate('student', 'name email');

    const totalStudents = progresses.length;

    // Calculate completion statistics
    let totalCompletedLectures = 0;
    let studentsCompleted = 0;
    const studentProgressData = [];
    const lectureCompletionMap = {};

    // Initialize lecture completion map
    course.sections?.forEach(section => {
        section.lectures?.forEach(lecture => {
            lectureCompletionMap[lecture._id.toString()] = {
                title: lecture.title,
                number: lecture.number,
                completedCount: 0,
                sectionTitle: section.title
            };
        });
    });

    progresses.forEach(progress => {
        const completedCount = progress.completedLectures?.filter(
            l => l.status === course.completedStatus || l.status === 'Completed'
        ).length || 0;

        totalCompletedLectures += completedCount;

        if (totalLectures > 0 && completedCount === totalLectures) {
            studentsCompleted++;
        }

        // Track per-student progress
        studentProgressData.push({
            studentId: progress.student?._id,
            studentName: progress.student?.name,
            completedLectures: completedCount,
            progressPercent: totalLectures > 0 ? Math.round((completedCount / totalLectures) * 100) : 0,
            enrolledAt: progress.createdAt
        });

        // Track per-lecture completion
        progress.completedLectures?.forEach(cl => {
            if ((cl.status === course.completedStatus || cl.status === 'Completed') && cl.lecture) {
                const lectureId = cl.lecture.toString();
                if (lectureCompletionMap[lectureId]) {
                    lectureCompletionMap[lectureId].completedCount++;
                }
            }
        });
    });

    // Calculate average progress
    const averageProgress = totalStudents > 0 && totalLectures > 0
        ? Math.round((totalCompletedLectures / (totalStudents * totalLectures)) * 100)
        : 0;

    // Get activity data for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activities = await Activity.find({
        course: courseId,
        createdAt: { $gte: thirtyDaysAgo }
    }).sort({ createdAt: 1 });

    // Group activities by date
    const dailyActivityMap = {};
    activities.forEach(act => {
        const dateStr = act.createdAt.toISOString().split('T')[0];
        if (!dailyActivityMap[dateStr]) {
            dailyActivityMap[dateStr] = { total: 0, completed: 0 };
        }
        dailyActivityMap[dateStr].total++;
        if (act.action === 'Completed') {
            dailyActivityMap[dateStr].completed++;
        }
    });

    // Generate last 30 days array
    const dailyActivity = [];
    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyActivity.push({
            date: dateStr,
            total: dailyActivityMap[dateStr]?.total || 0,
            completed: dailyActivityMap[dateStr]?.completed || 0
        });
    }

    // Get recent enrollments (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentEnrollments = progresses.filter(p => new Date(p.createdAt) >= sevenDaysAgo).length;

    // Sort lectures by completion rate
    const lectureStats = Object.values(lectureCompletionMap)
        .map(l => ({
            ...l,
            completionRate: totalStudents > 0 ? Math.round((l.completedCount / totalStudents) * 100) : 0
        }))
        .sort((a, b) => b.completionRate - a.completionRate);

    // Progress distribution (0-25%, 25-50%, 50-75%, 75-100%)
    const progressDistribution = {
        '0-25': 0,
        '25-50': 0,
        '50-75': 0,
        '75-100': 0
    };

    studentProgressData.forEach(s => {
        if (s.progressPercent <= 25) progressDistribution['0-25']++;
        else if (s.progressPercent <= 50) progressDistribution['25-50']++;
        else if (s.progressPercent <= 75) progressDistribution['50-75']++;
        else progressDistribution['75-100']++;
    });

    // Section-wise progress
    const sectionStats = course.sections?.map(section => {
        const sectionLectureIds = section.lectures?.map(l => l._id.toString()) || [];
        let sectionCompletedTotal = 0;

        progresses.forEach(progress => {
            const sectionCompleted = progress.completedLectures?.filter(cl =>
                (cl.status === course.completedStatus || cl.status === 'Completed') &&
                cl.lecture && sectionLectureIds.includes(cl.lecture.toString())
            ).length || 0;
            sectionCompletedTotal += sectionCompleted;
        });

        const sectionTotalPossible = sectionLectureIds.length * totalStudents;
        return {
            title: section.title,
            lectureCount: sectionLectureIds.length,
            averageCompletion: sectionTotalPossible > 0
                ? Math.round((sectionCompletedTotal / sectionTotalPossible) * 100)
                : 0
        };
    }) || [];

    res.status(200).json({
        courseTitle: course.title,
        overview: {
            totalStudents,
            totalLectures,
            studentsCompleted,
            averageProgress,
            recentEnrollments
        },
        progressDistribution,
        dailyActivity,
        lectureStats,
        sectionStats,
        topStudents: studentProgressData.sort((a, b) => b.progressPercent - a.progressPercent).slice(0, 5),
        recentActivity: activities.slice(-10).reverse().map(a => ({
            action: a.action,
            details: a.details,
            createdAt: a.createdAt
        }))
    });
});

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private (Admin or Course Owner)
const deleteCourse = asyncHandler(async (req, res) => {
    // Course is attached by verifyCourseOwnership middleware
    const course = req.course;

    // Delete all lectures in all sections
    for (const section of course.sections) {
        if (section.lectures && section.lectures.length > 0) {
            await Lecture.deleteMany({ _id: { $in: section.lectures } });
        }
    }

    // Delete all progress records for this course
    await Progress.deleteMany({ course: course._id });

    // Delete all activity records for this course
    await Activity.deleteMany({ course: course._id });

    // Delete the course
    await course.deleteOne();

    res.status(200).json({ id: req.params.id, message: 'Course deleted successfully' });
});

// @desc    Search courses
// @route   GET /api/courses/search
// @access  Private
const searchCourses = asyncHandler(async (req, res) => {
    const { q, filter = 'all' } = req.query;

    if (!q || !q.trim()) {
        return res.status(200).json([]);
    }

    const searchQuery = q.trim();
    const searchRegex = new RegExp(searchQuery, 'i');
    let results = [];

    // Search enrolled courses
    if (filter === 'all' || filter === 'enrolled') {
        const progresses = await Progress.find({ student: req.user.id })
            .populate({
                path: 'course',
                select: 'title description status',
                match: {
                    status: 'Published',
                    $or: [
                        { title: searchRegex },
                        { description: searchRegex }
                    ]
                }
            });

        const enrolledMatches = progresses
            .filter(p => p.course) // Filter out null courses (didn't match)
            .map(p => ({
                _id: p.course._id,
                title: p.course.title,
                type: 'enrolled'
            }));

        results = [...results, ...enrolledMatches];
    }

    // Search created/teaching courses
    if (filter === 'all' || filter === 'created') {
        // Owned courses
        const ownedCourses = await Course.find({
            user: req.user.id,
            $or: [
                { title: searchRegex },
                { description: searchRegex }
            ]
        }).select('title');

        const ownedMatches = ownedCourses.map(c => ({
            _id: c._id,
            title: c.title,
            type: 'created'
        }));

        // Teaching courses
        const teacherAssignments = await CourseTeacher.find({ teacher: req.user.id });
        const teacherCourseIds = teacherAssignments.map(t => t.course);

        const teachingCourses = await Course.find({
            _id: { $in: teacherCourseIds },
            $or: [
                { title: searchRegex },
                { description: searchRegex }
            ]
        }).select('title');

        const teachingMatches = teachingCourses.map(c => ({
            _id: c._id,
            title: c.title,
            type: 'created'
        }));

        results = [...results, ...ownedMatches, ...teachingMatches];
    }

    // Remove duplicates (same course could appear in both enrolled and created)
    const uniqueResults = [];
    const seen = new Set();
    for (const r of results) {
        const key = `${r._id}-${r.type}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueResults.push(r);
        }
    }

    res.status(200).json(uniqueResults.slice(0, 8));
});

// @desc    Get detailed progress of a specific student for a course (section/lecture breakdown)
// @route   GET /api/courses/:id/progress/:studentId
// @access  Private (Admin or Course Owner/Teacher with manage_students)
const getStudentProgressDetail = asyncHandler(async (req, res) => {
    const { id, studentId } = req.params;

    // Get the course with sections and populated lectures
    const course = await Course.findById(id).populate({
        path: 'sections.lectures',
        select: 'title number duration'
    });

    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    // Get the student info
    const student = await User.findById(studentId).select('name email');
    if (!student) {
        res.status(404);
        throw new Error('Student not found');
    }

    // Check if student is enrolled
    const progress = await Progress.findOne({ course: id, student: studentId });
    if (!progress) {
        res.status(404);
        throw new Error('Student is not enrolled in this course');
    }

    // Create a map of lecture progress for quick lookup
    const lectureProgressMap = new Map();
    progress.completedLectures.forEach(lp => {
        lectureProgressMap.set(lp.lecture.toString(), {
            status: lp.status,
            completedAt: lp.completedAt,
            notes: lp.notes
        });
    });

    // Build the structured response
    let totalLectures = 0;
    let completedLectures = 0;
    const completedStatus = course.completedStatus || 'Completed';

    const sectionsProgress = course.sections.map((section, sectionIndex) => {
        const lecturesProgress = section.lectures.map((lecture, lectureIndex) => {
            totalLectures++;
            const lectureProgress = lectureProgressMap.get(lecture._id.toString());
            const status = lectureProgress ? lectureProgress.status : 'Not Started';

            if (status === completedStatus) {
                completedLectures++;
            }

            return {
                _id: lecture._id,
                title: lecture.title,
                number: lecture.number || lectureIndex + 1,
                duration: lecture.duration,
                status: status,
                statusDate: lectureProgress ? lectureProgress.completedAt : null,
                notes: lectureProgress ? lectureProgress.notes : ''
            };
        });

        // Calculate section progress
        const sectionCompleted = lecturesProgress.filter(l => l.status === completedStatus).length;
        const sectionTotal = lecturesProgress.length;
        const sectionPercent = sectionTotal > 0 ? Math.round((sectionCompleted / sectionTotal) * 100) : 0;

        return {
            _id: section._id,
            title: section.title,
            sectionNumber: sectionIndex + 1,
            lectures: lecturesProgress,
            completedCount: sectionCompleted,
            totalCount: sectionTotal,
            progressPercent: sectionPercent
        };
    });

    const overallPercent = totalLectures > 0 ? Math.round((completedLectures / totalLectures) * 100) : 0;

    res.status(200).json({
        student: {
            _id: student._id,
            name: student.name,
            email: student.email
        },
        course: {
            _id: course._id,
            title: course.title,
            lectureStatuses: course.lectureStatuses
        },
        progress: {
            completedLectures,
            totalLectures,
            progressPercent: overallPercent
        },
        sections: sectionsProgress,
        enrolledAt: progress.createdAt
    });
});

// @desc    Get student's own analytics for a course
// @route   GET /api/courses/:id/my-analytics
// @access  Private (enrolled student)
const getMyAnalytics = asyncHandler(async (req, res) => {
    const courseId = req.params.id;
    const studentId = req.user.id;

    // Fetch course with sections populated
    const course = await Course.findById(courseId).populate({
        path: 'sections',
        populate: { path: 'lectures', select: 'title number dueDate' }
    });
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    const completionLabel = course.completedStatus || 'Completed';

    // Fetch student progress
    const progress = await Progress.findOne({ student: studentId, course: courseId });
    const completedLectures = progress?.completedLectures || [];

    // Build progress map
    const progressMap = {};
    completedLectures.forEach(l => {
        progressMap[l.lecture.toString()] = { status: l.status, completedAt: l.completedAt };
    });

    // Calculate total lectures
    let totalLectures = 0;
    course.sections.forEach(s => { totalLectures += s.lectures.length; });

    const completedCount = completedLectures.filter(l => l.status === completionLabel).length;
    const overallPercent = totalLectures > 0 ? Math.round((completedCount / totalLectures) * 100) : 0;

    // Section-wise progress
    const sectionProgress = course.sections.map(section => {
        const total = section.lectures.length;
        const completed = section.lectures.filter(l => progressMap[l._id.toString()]?.status === completionLabel).length;
        return {
            title: section.title,
            total,
            completed,
            percent: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    });

    // Daily activity (last 30 days) from Activity logs
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activities = await Activity.find({
        user: studentId,
        course: courseId,
        createdAt: { $gte: thirtyDaysAgo }
    }).sort({ createdAt: 1 });

    // Group by date
    const dailyActivity = {};
    activities.forEach(act => {
        const dateStr = act.createdAt.toISOString().split('T')[0];
        if (!dailyActivity[dateStr]) dailyActivity[dateStr] = 0;
        dailyActivity[dateStr]++;
    });

    // Fill in missing days
    const activityTimeline = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        activityTimeline.push({ date: dateStr, count: dailyActivity[dateStr] || 0 });
    }

    // Completion timeline (when lectures were completed, grouped by date)
    const completionTimeline = {};
    completedLectures.forEach(l => {
        if (l.status === completionLabel && l.completedAt) {
            const dateStr = new Date(l.completedAt).toISOString().split('T')[0];
            if (!completionTimeline[dateStr]) completionTimeline[dateStr] = 0;
            completionTimeline[dateStr]++;
        }
    });

    // Status distribution (how many lectures in each status)
    const statusDistribution = {};
    let notStartedCount = 0;
    course.sections.forEach(section => {
        section.lectures.forEach(lec => {
            const status = progressMap[lec._id.toString()]?.status || 'Not Started';
            if (status === 'Not Started') {
                notStartedCount++;
            } else {
                statusDistribution[status] = (statusDistribution[status] || 0) + 1;
            }
        });
    });
    if (notStartedCount > 0) {
        statusDistribution['Not Started'] = notStartedCount;
    }

    // Late submissions
    let lateCount = 0;
    let onTimeCount = 0;
    course.sections.forEach(section => {
        section.lectures.forEach(lec => {
            if (!lec.dueDate) return;
            const p = progressMap[lec._id.toString()];
            if (p?.status === completionLabel && p.completedAt) {
                if (new Date(p.completedAt) > new Date(lec.dueDate)) {
                    lateCount++;
                } else {
                    onTimeCount++;
                }
            }
        });
    });

    // Quiz performance
    const quizzes = await Quiz.find({ course: courseId, isActive: true }).select('title passingScore');
    const quizAttempts = await QuizAttempt.find({
        course: courseId,
        student: studentId,
        status: { $in: ['completed', 'timed-out'] }
    }).sort({ createdAt: 1 });

    const quizPerformance = quizzes.map(quiz => {
        const attempts = quizAttempts.filter(a => a.quiz.toString() === quiz._id.toString());
        const bestAttempt = attempts.reduce((best, a) => (a.percentage > (best?.percentage || 0) ? a : best), null);
        return {
            title: quiz.title,
            passingScore: quiz.passingScore,
            totalAttempts: attempts.length,
            bestScore: bestAttempt?.percentage || 0,
            passed: bestAttempt?.passed || false,
            scores: attempts.map(a => ({ score: a.percentage, date: a.completedAt || a.createdAt }))
        };
    });

    // Recent activity (last 10)
    const recentActivity = await Activity.find({
        user: studentId,
        course: courseId
    }).sort({ createdAt: -1 }).limit(10).select('action details createdAt');

    res.json({
        courseTitle: course.title,
        overview: {
            totalLectures,
            completedLectures: completedCount,
            overallPercent,
            totalQuizzes: quizzes.length,
            quizzesPassed: quizPerformance.filter(q => q.passed).length
        },
        sectionProgress,
        activityTimeline,
        completionTimeline,
        statusDistribution,
        submissions: { onTime: onTimeCount, late: lateCount },
        quizPerformance,
        recentActivity
    });
});

// @desc    Toggle markedForRevision for a lecture
// @route   PUT /api/courses/lectures/:id/toggle-revision
// @access  Private (enrolled student)
const toggleLectureRevision = asyncHandler(async (req, res) => {
    const lectureId = req.params.id;

    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
        res.status(404);
        throw new Error('Lecture not found');
    }

    const progress = await Progress.findOne({ student: req.user.id, course: lecture.course });
    if (!progress) {
        res.status(404);
        throw new Error('Not enrolled in this course');
    }

    const lectureIndex = progress.completedLectures.findIndex(
        (item) => item.lecture.toString() === lectureId
    );

    let markedForRevision;
    if (lectureIndex > -1) {
        markedForRevision = !progress.completedLectures[lectureIndex].markedForRevision;
        progress.completedLectures[lectureIndex].markedForRevision = markedForRevision;
    } else {
        // Create entry if it doesn't exist yet
        progress.completedLectures.push({
            lecture: lectureId,
            status: 'Not Started',
            notes: '',
            markedForRevision: true
        });
        markedForRevision = true;
    }

    await progress.save();

    res.locals.activity = {
        course: lecture.course,
        lecture: lectureId,
        action: markedForRevision ? 'Marked for Revision' : 'Removed from Revision',
        details: `${markedForRevision ? 'Marked' : 'Removed'} "${lecture.title}" ${markedForRevision ? 'for' : 'from'} revision`
    };

    res.status(200).json({ markedForRevision });
});

// @desc    Toggle AI block for a specific student in a course
// @route   PUT /api/courses/:id/ai-block/:studentId
// @access  Private (course owner/instructor)
const toggleAIBlockStudent = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id);
    if (!course) { res.status(404); throw new Error('Course not found'); }
    if (course.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        res.status(403); throw new Error('Not authorized');
    }
    const studentId = req.params.studentId;
    const isBlocked = course.aiBlockedStudents.some(id => id.toString() === studentId);
    if (isBlocked) {
        course.aiBlockedStudents = course.aiBlockedStudents.filter(id => id.toString() !== studentId);
    } else {
        course.aiBlockedStudents.push(studentId);
    }
    await course.save();

    // Notification trigger: AI access change (single student)
    if (course.notificationSettings?.aiAccessChange) {
        const { notifyUser } = require('./notificationController');
        notifyUser(studentId, {
            courseId: course._id,
            title: !isBlocked ? 'AI Access Blocked' : 'AI Access Restored',
            message: !isBlocked ? `Your AI access has been blocked in "${course.title}"` : `Your AI access has been restored in "${course.title}"`,
            type: 'ai_access',
            link: `/course/${course._id}`
        });
    }

    res.locals.activity = {
        course: course._id,
        action: !isBlocked ? 'Student AI Blocked' : 'Student AI Unblocked',
        details: `${!isBlocked ? 'Blocked' : 'Unblocked'} student AI access in "${course.title}"`
    };
    res.json({ blocked: !isBlocked, studentId });
});

// @desc    Toggle allowStudentAI for a course
// @route   PUT /api/courses/:id/toggle-student-ai
// @access  Private (course owner/instructor)
const toggleStudentAI = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id);
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }
    if (course.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Not authorized');
    }
    course.allowStudentAI = !course.allowStudentAI;
    await course.save();

    // Notification trigger: AI access change
    if (course.notificationSettings?.aiAccessChange) {
        const { notifyCourseStudents } = require('./notificationController');
        notifyCourseStudents(course._id, {
            title: course.allowStudentAI ? 'AI Access Enabled' : 'AI Access Disabled',
            message: course.allowStudentAI ? `You can now use the instructor's AI key in "${course.title}"` : `Instructor AI key access has been disabled in "${course.title}"`,
            type: 'ai_access',
            link: `/course/${course._id}`
        });
    }

    res.locals.activity = {
        course: course._id,
        action: course.allowStudentAI ? 'Student AI Enabled' : 'Student AI Disabled',
        details: `${course.allowStudentAI ? 'Enabled' : 'Disabled'} student AI access for "${course.title}"`
    };
    res.json({ allowStudentAI: course.allowStudentAI });
});

module.exports = {
    createCourse,
    updateCourse,
    deleteCourse,
    getCourses,
    getCourse,
    addSection,
    updateSection,
    deleteSection,
    addLectureToSection,
    enrollStudent,
    getEnrolledCourses,
    getCreatedCourses,
    updateLectureProgress,
    toggleLectureRevision,
    getStudentActivity,
    getCourseProgresses,
    addComment,
    getLectureComments,
    updateLecture,
    deleteLecture,
    getLecture,
    getUserStats,
    removeStudent,
    getMyProgress,
    getCourseAnalytics,
    searchCourses,
    getStudentProgressDetail,
    getEnrolledStudentList,
    getPeerStudentList,
    getPeerStudentProgress,
    getMyAnalytics,
    toggleStudentAI,
    toggleAIBlockStudent
};
