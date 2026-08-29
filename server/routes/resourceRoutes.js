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
            'application/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];

        const isCsv = file.mimetype.includes('csv');
        const isExcel = file.mimetype.includes('excel') || file.mimetype.includes('spreadsheetml');

        cb(null, allowed.includes(file.mimetype) || isCsv || isExcel);
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
