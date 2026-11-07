const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Images are public. Payment slips are only served through the purchase routes.
    kind: {
        type: String,
        enum: ['image', 'slip'],
        required: true
    },
    data: {
        type: Buffer,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Upload', uploadSchema);
