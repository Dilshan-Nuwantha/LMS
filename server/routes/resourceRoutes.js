const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const { verifyCourseContentPermission } = require('../middleware/ownershipMiddleware');
const {
    uploadResource,
    getResources,
    downloadResource,
    viewResource,
    updateResource,
    deleteResource,
    toggleStudentUploads,
    getResourcesByLecture,
    getCourseResourceCounts
} = require('../controllers/resourceController');

const upload = multer({
    storage: multer.memoryStorage(),
    defParamCharset: 'utf8',
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = [
            'application/pdf',
            'image/png', 'image/jpeg', 'image/gif', 'image/webp',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'text/csv',
            'text/x-csv',
            'text/comma-separated-values',
            'application/csv',
            'application/x-csv',
            'application/excel',
            'application/x-excel',
            'application/x-msexcel',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];

        // Bad type headers fall back to text/plain, so the name has to match as well
        const allowedName = /\.(pdf|png|jpe?g|gif|webp|docx?|pptx?|txt|csv|xlsx?)$/i;

        cb(null, allowed.includes(file.mimetype) && allowedName.test(file.originalname));
    }
});

// Teacher toggle for student uploads (before :resourceId routes)
router.put('/:courseId/toggle-student-uploads', protect, verifyCourseContentPermission, toggleStudentUploads);

// Lecture-specific resources
router.get('/:courseId/lecture/:lectureId', protect, getResourcesByLecture);

// Resource counts map
router.get('/:courseId/counts', protect, getCourseResourceCounts);

// Resource routes
router.get('/:courseId', protect, getResources);
router.post('/:courseId', protect, upload.single('file'), uploadResource);
router.get('/:courseId/:resourceId/download', protect, downloadResource);
router.get('/:courseId/:resourceId/view', protect, viewResource);
router.put('/:courseId/:resourceId', protect, updateResource);
router.delete('/:courseId/:resourceId', protect, deleteResource);

module.exports = router;
