const Activity = require('../models/Activity');
const User = require('../models/User'); // Corrected path

// @desc    Get all activities (admin only)
// @route   GET /api/activities
// @access  Private/Admin
const getGlobalActivities = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        // Build query
        const query = {};

        // 1. Date Range Filter
        if (req.query.dateFrom || req.query.dateTo) {
            query.createdAt = {};
            if (req.query.dateFrom) query.createdAt.$gte = new Date(req.query.dateFrom);
            if (req.query.dateTo) {
                const to = new Date(req.query.dateTo);
                to.setHours(23, 59, 59, 999);
                query.createdAt.$lte = to;
            }
        }

        // 2. HTTP Method Filter
        if (req.query.method) {
            const methods = req.query.method.split(',').map(m => m.trim().toUpperCase()).filter(Boolean);
            if (methods.length === 1) query.method = methods[0];
            else if (methods.length > 1) query.method = { $in: methods };
        }

        // 3. Action Filter (supports comma-separated multiple values)
        if (req.query.action && req.query.action !== 'All') {
            const actions = req.query.action.split(',').map(a => a.trim()).filter(Boolean);
            query.action = actions.length === 1 ? actions[0] : { $in: actions };
        }

        // 2. User Filter (Search by name or email)
        if (req.query.user) {
            const userRegex = new RegExp(req.query.user, 'i');
            const users = await User.find({
                $or: [{ name: userRegex }, { email: userRegex }]
            }).select('_id');
            const userIds = users.map(u => u._id);

            // If we found users matching the name, look for activities by those users
            // If no users found, we force an empty result (using a dummy ID) or just empty array logic
            if (userIds.length > 0) {
                query.$or = [
                    { user: { $in: userIds } },
                    { student: { $in: userIds } } // Support legacy field
                ];
            } else {
                // Force empty result if user name not found
                return res.status(200).json({ activities: [], page, pages: 0, total: 0 });
            }
        }

        // 3. General Search (Action or Details)
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            // If we already have a user query, we must use $and.
            // But simpler is to add logic to the top-level query object.
            // Let's assume general search also searches details.

            const searchCondition = {
                $or: [
                    { action: searchRegex },
                    { details: searchRegex },
                    { url: searchRegex },
                    { method: searchRegex }
                ]
            };

            // If we already added conditions, we mix them.
            // If 'user' filter was applied, it is in `query.$or` or `query.user`.
            // Mongoose query merging can be tricky if we overwrite $or.

            if (query.$or) {
                // If user filter exists ($or), we need to AND it with search.
                query.$and = [
                    { $or: query.$or }, // Existing user condition
                    searchCondition // New search condition
                ];
                delete query.$or; // Remove the top-level $or
            } else {
                query.$or = searchCondition.$or;
            }
        }

        const activities = await Activity.find(query)
            .populate('user', 'name email role')
            .populate('student', 'name email role') // Fallback populate
            .populate('course', 'title')
            .populate('lecture', 'title number')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await Activity.countDocuments(query);

        res.status(200).json({
            activities,
            page,
            pages: Math.ceil(total / limit),
            total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get current user's own activities
// @route   GET /api/activities/me
// @access  Private
const getMyActivities = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const query = {
            $or: [{ user: req.user._id }, { student: req.user._id }],
            action: { $ne: 'Impersonated' }
        };

        if (req.query.dateFrom || req.query.dateTo) {
            query.createdAt = {};
            if (req.query.dateFrom) query.createdAt.$gte = new Date(req.query.dateFrom);
            if (req.query.dateTo) {
                const to = new Date(req.query.dateTo);
                to.setHours(23, 59, 59, 999);
                query.createdAt.$lte = to;
            }
        }

        if (req.query.method) {
            const methods = req.query.method.split(',').map(m => m.trim().toUpperCase()).filter(Boolean);
            query.method = methods.length === 1 ? methods[0] : { $in: methods };
        }

        if (req.query.action && req.query.action !== 'All') {
            const actions = req.query.action.split(',').map(a => a.trim()).filter(Boolean);
            query.action = actions.length === 1 ? actions[0] : { $in: actions };
        }

        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            const searchCondition = { $or: [{ action: searchRegex }, { details: searchRegex }, { url: searchRegex }] };
            query.$and = [{ $or: query.$or }, searchCondition];
            delete query.$or;
        }

        const activities = await Activity.find(query)
            .populate('user', 'name email role')
            .populate('course', 'title')
            .populate('lecture', 'title number')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await Activity.countDocuments(query);

        res.status(200).json({ activities, page, pages: Math.ceil(total / limit), total });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getGlobalActivities,
    getMyActivities
};
