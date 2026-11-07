const mongoose = require('mongoose');
const Activity = require('../models/Activity');

// Only these request fields are stored. Anything else, such as passwords, API keys,
// bank details or sign-in codes, never reaches the log.
const LOGGED_FIELDS = [
    'title', 'status', 'priority', 'importance', 'isActive', 'isPublic', 'isPreview',
    'courseId', 'sectionId', 'lectureId', 'rating', 'reason', 'role', 'email',
    'amount', 'currency', 'method', 'provider', 'model', 'discountType', 'discountValue',
    'hideCourses', 'maxWarnings'
];

const pickLoggedFields = (body) => Object.fromEntries(
    LOGGED_FIELDS
        .filter(field => ['string', 'number', 'boolean'].includes(typeof body?.[field]))
        .map(field => [field, body[field]])
);

const activityLogger = async (req, res, next) => {
    // We use 'finish' to ensure we capture the outcome and any user set during the request (e.g. Login)
    res.on('finish', async () => {
        try {
            // 1. Only log state-changing methods
            if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
                return;
            }

            // 2. Identify User
            // check req.user (from protect middleware) OR res.locals.user (from authController)
            const user = req.user || res.locals.user;
            if (!user) return; // Don't log anonymous actions

            const userId = req.impersonatedBy || user._id || user.id;

            // 3. Prepare Event Data (Body)
            const eventData = pickLoggedFields(req.body);

            const url = req.originalUrl;

            // 4. Determine Action Context (heuristic)
            let action = '';
            let details = '';
            let lectureId = null;

            // Auth
            if (url.includes('/auth/google')) { action = 'Login'; details = 'User logged in via Google'; }
            else if (url.includes('/impersonate')) { action = 'Impersonated'; details = `Admin logged in as ${eventData.email || 'a user'}`; }
            else if (url.includes('/login')) { action = 'Login'; details = 'User logged in'; }
            else if (url.includes('/register')) { action = 'Registered'; details = 'User registered'; }
            else if (url.includes('/updatepassword')) { action = 'Password Updated'; details = 'User updated password'; }
            else if (url.includes('/auth/profile')) { action = 'Profile Updated'; details = 'Updated profile information'; }
            // Course management
            else if (url.includes('/enroll') && req.method === 'DELETE') { action = 'Unenrolled'; details = 'Student removed from course'; }
            else if (url.includes('/enroll')) { action = 'Enrolled'; details = 'Enrolled in course'; }
            else if (url.includes('/comments')) { action = 'Comment'; details = 'Added a comment on a lecture'; }
            else if (url.match(/\/lectures\/[a-f0-9]{24}\/progress/i)) { action = 'Status Updated'; details = `Lecture progress updated`; }
            else if (url.match(/\/lectures\/[a-f0-9]{24}\/toggle-revision/i)) { action = 'Revision Toggled'; details = 'Toggled revision bookmark on a lecture'; }
            else if (url.match(/\/lectures\/[a-f0-9]{24}$/i) && req.method === 'PUT') { action = 'Lecture Updated'; details = `Updated lecture${eventData.title ? ': ' + eventData.title : ''}`; }
            else if (url.match(/\/lectures\/[a-f0-9]{24}$/i) && req.method === 'DELETE') { action = 'Lecture Deleted'; details = 'Deleted a lecture'; }
            else if (url.match(/\/sections\/[a-f0-9]{24}\/lectures/i)) { action = 'Lecture Added'; details = `Added new lecture${eventData.title ? ': ' + eventData.title : ''}`; }
            else if (url.match(/\/sections\/[a-f0-9]{24}$/i) && req.method === 'PUT') { action = 'Section Updated'; details = `Updated section${eventData.title ? ': ' + eventData.title : ''}`; }
            else if (url.match(/\/sections\/[a-f0-9]{24}$/i) && req.method === 'DELETE') { action = 'Section Deleted'; details = 'Deleted a section'; }
            else if (url.match(/\/sections$/i) && req.method === 'POST') { action = 'Section Added'; details = `Added new section${eventData.title ? ': ' + eventData.title : ''}`; }
            else if (url.match(/\/courses\/[a-f0-9]{24}$/i) && req.method === 'PUT') { action = 'Course Updated'; details = 'Updated course settings'; }
            else if (url.match(/\/courses\/[a-f0-9]{24}$/i) && req.method === 'DELETE') { action = 'Course Deleted'; details = 'Deleted a course'; }
            else if (url.match(/\/courses$/i) && req.method === 'POST') { action = 'Course Created'; details = `Created new course${eventData.title ? ': ' + eventData.title : ''}`; }
            // Instructors
            else if (url.includes('/instructors') && req.method === 'POST') { action = 'Instructor Added'; details = 'Added an instructor to the course'; }
            else if (url.includes('/instructors/leave')) { action = 'Instructor Left'; details = 'Left the course as instructor'; }
            else if (url.includes('/instructors') && req.method === 'DELETE') { action = 'Instructor Removed'; details = 'Removed an instructor from the course'; }
            else if (url.includes('/instructors') && req.method === 'PUT') { action = 'Instructor Updated'; details = 'Updated instructor permissions'; }
            // Broadcasts
            else if (url.includes('/broadcasts') && url.includes('/mark-read')) { action = 'Broadcast Read'; details = 'Marked announcements as read'; }
            else if (url.includes('/broadcasts') && url.includes('/settings')) { action = 'Broadcast Settings'; details = 'Updated broadcast settings'; }
            else if (url.includes('/broadcasts') && req.method === 'POST') { action = 'Broadcast Created'; details = `Sent announcement${eventData.title ? ': ' + eventData.title : ''}`; }
            else if (url.includes('/broadcasts') && req.method === 'PUT') { action = 'Broadcast Updated'; details = 'Updated an announcement'; }
            else if (url.includes('/broadcasts') && req.method === 'DELETE') { action = 'Broadcast Deleted'; details = 'Deleted an announcement'; }
            // Quizzes
            else if (url.includes('/quizzes') && url.includes('/start')) { action = 'Quiz Started'; details = 'Started a quiz attempt'; }
            else if (url.includes('/quizzes') && url.includes('/submit')) { action = 'Quiz Submitted'; details = 'Submitted a quiz'; }
            else if (url.includes('/quizzes') && req.method === 'POST') { action = 'Quiz Created'; details = `Created new quiz${eventData.title ? ': ' + eventData.title : ''}`; }
            else if (url.includes('/quizzes') && req.method === 'PUT') { action = 'Quiz Updated'; details = 'Updated a quiz'; }
            else if (url.includes('/quizzes') && req.method === 'DELETE') { action = 'Quiz Deleted'; details = 'Deleted a quiz'; }
            // Resources
            else if (url.includes('/resources') && url.includes('/toggle-student-uploads')) { action = 'Resource Settings'; details = 'Toggled student upload permission'; }
            else if (url.includes('/resources') && req.method === 'POST') { action = 'Resource Uploaded'; details = `Uploaded a resource${eventData.title ? ': ' + eventData.title : ''}`; }
            else if (url.includes('/resources') && req.method === 'DELETE') { action = 'Resource Deleted'; details = 'Deleted a resource'; }
            // Admin actions
            else if (url.includes('/warnings/') && req.method === 'DELETE') { action = 'Warning Removed'; details = 'Removed a warning from a user'; }
            else if (url.includes('/warn')) { action = 'User Warned'; details = 'Sent a warning to a user'; }
            else if (url.includes('/block') && url.includes('/users')) { action = 'User Blocked'; details = 'Blocked a user'; }
            else if (url.includes('/unblock') && url.includes('/users')) { action = 'User Unblocked'; details = 'Unblocked a user'; }
            else if (url.includes('/role')) { action = 'Role Changed'; details = 'Changed a user role'; }
            else if (url.includes('/block') && url.includes('/courses')) { action = 'Course Blocked'; details = 'Blocked a course'; }
            else if (url.includes('/unblock') && url.includes('/courses')) { action = 'Course Unblocked'; details = 'Unblocked a course'; }
            // Notifications
            else if (url.includes('/notifications') && url.includes('/send')) { action = 'Notification Sent'; details = `Sent notification${eventData.title ? ': ' + eventData.title : ''}`; }
            else if (url.includes('/notifications') && url.includes('/settings')) { action = 'Notification Settings Updated'; details = 'Updated notification trigger settings'; }
            else if (url.includes('/notifications') && url.includes('/mark-all-read')) { action = 'Notifications Read'; details = 'Marked all notifications as read'; }
            else if (url.includes('/notifications') && url.includes('/read')) { action = 'Notification Read'; details = 'Marked a notification as read'; }
            else if (url.includes('/notifications') && req.method === 'DELETE') { action = 'Notification Deleted'; details = 'Deleted a notification'; }

            // Extract lecture ID from URL pattern /lectures/:id
            const lectureMatch = url.match(/\/lectures\/([a-f0-9]{24})/i);
            if (lectureMatch) lectureId = lectureMatch[1];

            // 5. Construct Log
            const logData = {
                user: userId,
                action: action || req.method,
                method: req.method,
                url: req.originalUrl,
                ip: req.ip,
                data: eventData,
                details: details || action || `${req.method} action performed`
            };

            if (lectureId) logData.lecture = lectureId;

            // Link to Course - extract from URL params, body, or parse from URL
            let courseId = req.body?.courseId || req.body?.course || req.params?.id || req.params?.courseId || res.locals.course?._id;

            // Fallback: extract course ID from URL pattern /courses/:id
            if (!courseId && url.includes('/courses/')) {
                const match = url.match(/\/courses\/([a-f0-9]{24})/i);
                if (match) courseId = match[1];
            }

            // The id can come from the request body, and a bad one must not lose the whole entry
            if (mongoose.isValidObjectId(courseId)) logData.course = courseId;

            // Override from Controller
            if (res.locals.activity) {
                if (res.locals.activity.skip) return;
                if (res.locals.activity.action) logData.action = res.locals.activity.action;
                if (res.locals.activity.details) logData.details = res.locals.activity.details;
                if (res.locals.activity.course) logData.course = res.locals.activity.course;
                if (res.locals.activity.lecture) logData.lecture = res.locals.activity.lecture;
            }

            // A refused request is still worth keeping, but it must not read as done
            if (res.statusCode >= 400) logData.action = `Failed: ${logData.action}`;

            if (req.impersonatedBy) logData.details = `[Impersonating ${user.email}] ${logData.details}`;

            await Activity.create(logData);

        } catch (err) {
            console.error('Activity Logger Error:', err.message);
        }
    });

    next();
};

module.exports = activityLogger;
