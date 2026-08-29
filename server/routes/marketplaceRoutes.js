const express = require('express');
const router = express.Router();
const {
    getMarketplaceCourses,
    getMarketplaceCourse,
    searchMarketplace,
    getCategories
} = require('../controllers/marketplaceController');

// All routes are public
router.get('/', getMarketplaceCourses);
router.get('/search', searchMarketplace);
router.get('/categories', getCategories);
router.get('/:id', getMarketplaceCourse);

module.exports = router;
