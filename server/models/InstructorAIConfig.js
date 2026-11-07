const mongoose = require('mongoose');

const instructorAIConfigSchema = new mongoose.Schema({
    instructor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    provider: {
        type: String,
        enum: ['openai', 'gemini', 'anthropic'],
        required: true
    },
    apiKey: {
        type: String,
        required: true  // stored encrypted
    },
    model: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('InstructorAIConfig', instructorAIConfigSchema);
