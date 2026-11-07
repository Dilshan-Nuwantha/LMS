const asyncHandler = require('express-async-handler');
const Category = require('../models/Category');
const Course = require('../models/Course');

// The lists the course forms used before categories moved to the database
const DEFAULT_CATEGORIES = [
    'Web Development', 'Mobile Development', 'Data Science', 'Machine Learning',
    'Programming Languages', 'DevOps', 'Database', 'Security', 'Cloud Computing',
    'Development', 'Business', 'Design', 'Marketing', 'IT & Software',
    'Personal Development', 'Photography', 'Music', 'Health & Fitness', 'Other'
];

const keyFor = (name) => name.trim().toLowerCase();

// Fills an empty collection once, from the old lists and what courses already use
const ensureCategories = async () => {
    if (await Category.exists({})) return;

    const used = await Course.distinct('category', { category: { $nin: ['', null] } });
    const byKey = new Map([...DEFAULT_CATEGORIES, ...used].map(name => [keyFor(name), name.trim()]));
    const docs = [...byKey].map(([key, name]) => ({ key, name }));

    // ordered: false lets a second server starting at the same moment skip what the first added
    await Category.insertMany(docs, { ordered: false }).catch((err) => {
        if (err.code !== 11000) throw err;
    });
};

// Every saved category, plus any a published course uses that was added before it was saved
const getCategoryNames = async () => {
    await ensureCategories();

    const [saved, used] = await Promise.all([
        Category.find().select('name').lean(),
        Course.distinct('category', {
            isMarketplace: true,
            status: 'Published',
            isAdminBlocked: { $ne: true },
            category: { $nin: ['', null] }
        })
    ]);

    return [...new Set([...saved.map(c => c.name), ...used])].sort((a, b) => a.localeCompare(b));
};

// @desc    Get categories with their ids, for the admin panel
// @route   GET /api/categories
// @access  Private (Admin)
const getCategories = asyncHandler(async (req, res) => {
    await ensureCategories();
    res.status(200).json(await Category.find().select('name').sort({ key: 1 }).lean());
});

// @desc    Add a category
// @route   POST /api/categories
// @access  Private (Admin)
const addCategory = asyncHandler(async (req, res) => {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';

    if (!name) {
        res.status(400);
        throw new Error('Please add a category name');
    }

    await ensureCategories();

    if (await Category.exists({ key: keyFor(name) })) {
        res.status(400);
        throw new Error('This category already exists');
    }

    res.status(201).json(await Category.create({ name, key: keyFor(name) }));
});

// @desc    Delete a category. Courses already using it keep their category.
// @route   DELETE /api/categories/:id
// @access  Private (Admin)
const deleteCategory = asyncHandler(async (req, res) => {
    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
        res.status(404);
        throw new Error('Category not found');
    }

    res.status(200).json({ message: 'Category deleted' });
});

module.exports = { getCategoryNames, getCategories, addCategory, deleteCategory };
