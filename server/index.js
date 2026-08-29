const dns = require("dns").promises;
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const express = require('express');
const dotenv = require('dotenv').config();
const { errorHandler } = require('./middleware/errorMiddleware');
const activityLogger = require('./middleware/activityLogger');
const { apiLimiter } = require('./middleware/rateLimiter');
const connectDB = require('./config/db');
const cors = require('cors');
const https = require('https');
const http = require('http');

const port = process.env.PORT || 5000;

connectDB();

const app = express();

// Trust proxy (required for Render, rate-limiting, and correct client IP)
app.set('trust proxy', 1);

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    exposedHeaders: ['Content-Disposition']
}));

// Stripe webhook needs raw body - must be before express.json()
app.post('/api/purchase/webhook',
    express.raw({ type: 'application/json' }),
    require('./controllers/purchaseController').handleStripeWebhook
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check route (no auth, no rate limit)
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// Activity Logger - Tracks non-GET requests
app.use(activityLogger);

// Existing routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/broadcasts', require('./routes/broadcastRoutes'));
app.use('/api/activities', require('./routes/activityRoutes'));
app.use('/api/quizzes', require('./routes/quizRoutes'));

// Marketplace routes
app.use('/api/marketplace', require('./routes/marketplaceRoutes'));
app.use('/api/purchase', require('./routes/purchaseRoutes'));
app.use('/api/instructor', require('./routes/instructorRoutes'));
app.use('/api/coupons', require('./routes/couponRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));

// Resource routes
app.use('/api/resources', require('./routes/resourceRoutes'));

// AI generation routes
app.use('/api/ai', require('./routes/aiRoutes'));

// Student AI chatbot routes
app.use('/api/student-ai', require('./routes/studentAiRoutes'));

// Admin routes
app.use('/api/admin', require('./routes/adminRoutes'));

// Notification routes
app.use('/api/notifications', require('./routes/notificationRoutes'));

// Error handler middleware
app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }
    const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

// Due date reminder check — runs every hour
const checkDueDateReminders = async () => {
    try {
        const Lecture = require('./models/Lecture');
        const Course = require('./models/Course');
        const Notification = require('./models/Notification');
        const { notifyCourseStudents } = require('./controllers/notificationController');

        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // Find lectures with dueDate between now and 24h from now
        const lectures = await Lecture.find({
            dueDate: { $gte: now, $lte: tomorrow },
            isPublic: true
        }).lean();

        if (!lectures.length) return;

        // Group by course
        const courseIds = [...new Set(lectures.map(l => l.course.toString()))];
        const courses = await Course.find({
            _id: { $in: courseIds },
            'notificationSettings.dueDateReminder': true
        }).select('_id title notificationSettings').lean();

        const courseMap = {};
        courses.forEach(c => { courseMap[c._id.toString()] = c; });

        for (const lec of lectures) {
            const course = courseMap[lec.course.toString()];
            if (!course) continue;

            // Check if reminder already sent for this lecture (avoid duplicates)
            const existing = await Notification.findOne({
                type: 'due_date',
                link: { $regex: lec._id.toString() }
            }).lean();
            if (existing) continue;

            const dueStr = new Date(lec.dueDate).toLocaleDateString();
            await notifyCourseStudents(course._id, {
                title: `Due Tomorrow: ${lec.title}`,
                message: `"${lec.title}" in "${course.title}" is due on ${dueStr}`,
                type: 'due_date',
                link: `/course/${course._id}/lecture/${lec._id}`,
                priority: 'important'
            });
            console.log(`[Due Date Reminder] Sent for "${lec.title}" in "${course.title}"`);
        }
    } catch (err) {
        console.error('[Due Date Reminder] Error:', err.message);
    }
};

app.listen(port, () => {
    console.log(`Server started on port ${port}`);

    // Run due date check on startup and every hour
    checkDueDateReminders();
    setInterval(checkDueDateReminders, 60 * 60 * 1000);

    // Keep-alive: self-ping at random intervals (30s - 120s) between 6:00 PM and 2:00 AM IST
    const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
    if (RENDER_URL && process.env.KEEP_ALIVE === 'true') {
        const pingServer = () => {
            const delay = Math.floor(Math.random() * (120000 - 30000 + 1)) + 30000;
            setTimeout(() => {
                // Get current IST hour safely
                const utcMs = new Date().getTime();
                const istMs = utcMs + (5.5 * 60 * 60 * 1000); // UTC +5:30
                const currentHour = new Date(istMs).getUTCHours();
                
                // Active hours: 6 PM (18) to 2 AM (2)
                const isActiveHour = currentHour >= 18 || currentHour < 2;

                if (isActiveHour) {
                    const url = `${RENDER_URL}/api/health`;
                    const client = url.startsWith('https') ? https : http;
                    client.get(url, (res) => {
                        console.log(`[Keep-Alive] Pinged ${url} — Status: ${res.statusCode} (next in ${Math.round(delay / 1000)}s)`);
                    }).on('error', (err) => {
                        console.error(`[Keep-Alive] Ping failed:`, err.message);
                    });
                } else {
                    console.log(`[Keep-Alive] Skipped ping. Current IST hour: ${currentHour} is outside active hours (18 - 1). Next check in ${Math.round(delay / 1000)}s`);
                }
                pingServer();
            }, delay);
        };
        pingServer();
        console.log('[Keep-Alive] Self-ping enabled for Render (Active: 6 PM - 2 AM IST)');
    }
});
