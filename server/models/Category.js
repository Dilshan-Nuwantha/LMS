const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a category name'],
        trim: true,
        maxlength: [50, 'Category name is too long']
    },
    // Keeps "Design" and "design" from both being added
    key: {
        type: String,
        required: true,
        unique: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Category', categorySchema);
