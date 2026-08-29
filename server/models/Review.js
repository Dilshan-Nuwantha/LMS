const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Course'
    },
    rating: {
        type: Number,
        required: [true, 'Please add a rating'],
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        default: ''
    },
    helpful: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Compound unique index: one review per user per course
reviewSchema.index({ user: 1, course: 1 }, { unique: true });

// Static method to calculate average rating for a course
reviewSchema.statics.calculateAverageRating = async function (courseId) {
    const result = await this.aggregate([
        { $match: { course: courseId } },
        {
            $group: {
                _id: '$course',
                averageRating: { $avg: '$rating' },
                count: { $sum: 1 }
            }
        }
    ]);

    try {
        const Course = require('./Course');
        if (result.length > 0) {
            await Course.findByIdAndUpdate(courseId, {
                rating: {
                    average: Math.round(result[0].averageRating * 10) / 10,
                    count: result[0].count
                }
            });
        } else {
            await Course.findByIdAndUpdate(courseId, {
                rating: { average: 0, count: 0 }
            });
        }
    } catch (error) {
        console.error('Error updating course rating:', error);
    }
};

// Update course rating after save
reviewSchema.post('save', function () {
    this.constructor.calculateAverageRating(this.course);
});

// Update course rating after remove
reviewSchema.post('deleteOne', { document: true, query: false }, function () {
    this.constructor.calculateAverageRating(this.course);
});

module.exports = mongoose.model('Review', reviewSchema);
