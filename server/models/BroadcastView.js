const mongoose = require('mongoose');

const broadcastViewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    lastViewedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound index for efficient lookups
broadcastViewSchema.index({ user: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('BroadcastView', broadcastViewSchema);
