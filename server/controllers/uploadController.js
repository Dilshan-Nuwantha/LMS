const asyncHandler = require('express-async-handler');
const Upload = require('../models/Upload');
const { sniffFileType } = require('../utils/fileType');

// @desc    Upload a profile picture or course thumbnail
// @route   POST /api/uploads/image
// @access  Private
const uploadImage = asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error('Please choose an image');
    }

    const mimeType = sniffFileType(req.file.buffer);
    if (!mimeType?.startsWith('image/')) {
        res.status(400);
        throw new Error('Only PNG, JPEG or WebP images are allowed');
    }

    const upload = await Upload.create({
        owner: req.user.id,
        kind: 'image',
        data: req.file.buffer,
        mimeType,
        size: req.file.size
    });

    res.status(201).json({ url: `${req.protocol}://${req.get('host')}/api/uploads/${upload._id}` });
});

// @desc    Show an uploaded image
// @route   GET /api/uploads/:id
// @access  Public
const getImage = asyncHandler(async (req, res) => {
    const upload = await Upload.findOne({ _id: req.params.id, kind: 'image' });

    if (!upload) {
        res.status(404);
        throw new Error('Image not found');
    }

    res.set({
        'Content-Type': upload.mimeType,
        'Content-Length': upload.size,
        'Cache-Control': 'public, max-age=86400'
    });
    res.send(upload.data);
});

module.exports = { uploadImage, getImage };
