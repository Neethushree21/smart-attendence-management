const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getDashboard, getAttendanceHistory } = require('../controllers/studentController');

// All routes require student role
router.use(protect, authorize('student'));

// GET /api/student/dashboard
router.get('/dashboard', getDashboard);

// GET /api/student/attendance/:classId
router.get('/attendance/:classId', getAttendanceHistory);

module.exports = router;
