const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { markAttendance, getStudentAttendance } = require('../controllers/attendanceController');

// POST /api/attendance/mark — student scans QR code
router.post(
  '/mark',
  protect,
  authorize('student'),
  [body('qrToken').notEmpty().withMessage('QR token is required')],
  validate,
  markAttendance
);

// GET /api/attendance/:studentId — get student attendance records
router.get('/:studentId', protect, authorize('student', 'admin', 'teacher'), getStudentAttendance);

module.exports = router;
