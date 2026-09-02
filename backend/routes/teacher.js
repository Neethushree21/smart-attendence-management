const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createClass,
  getClasses,
  addStudentsToClass,
  getSessions,
  getClassAttendance,
  getAllStudents,
} = require('../controllers/teacherController');

// All routes require teacher role
router.use(protect, authorize('teacher'));

// POST /api/teacher/classes — create a new class
router.post(
  '/classes',
  [
    body('subjectName').notEmpty().withMessage('Subject name is required'),
    body('subjectCode').notEmpty().withMessage('Subject code is required'),
  ],
  validate,
  createClass
);

// GET /api/teacher/classes — list teacher's classes
router.get('/classes', getClasses);

// POST /api/teacher/classes/:classId/students — add students to class
router.post('/classes/:classId/students', addStudentsToClass);

// GET /api/teacher/sessions — list all sessions created by teacher
router.get('/sessions', getSessions);

// GET /api/teacher/attendance/:classId — view/download attendance for a class
router.get('/attendance/:classId', getClassAttendance);

// GET /api/teacher/students — list all registered students
router.get('/students', getAllStudents);

module.exports = router;
