const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const { getGlobalActivities, getMyActivities } = require('../controllers/activityController');

router.get('/me', protect, getMyActivities);
router.get('/', protect, admin, getGlobalActivities);

module.exports = router;
