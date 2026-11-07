const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const { uploadImage, getImage } = require('../controllers/uploadController');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }
});

router.post('/image', protect, upload.single('image'), uploadImage);
router.get('/:id', getImage);

module.exports = router;
