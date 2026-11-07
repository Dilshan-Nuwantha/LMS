const express = require('express');
const router = express.Router();
const { getCategories, addCategory, deleteCategory } = require('../controllers/categoryController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', protect, admin, getCategories);
router.post('/', protect, admin, addCategory);
router.delete('/:id', protect, admin, deleteCategory);

module.exports = router;
