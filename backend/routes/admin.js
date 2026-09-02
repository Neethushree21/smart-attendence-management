const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getStats,
  getAllUsers,
  getLowAttendanceStudents,
  getAllClasses,
  toggleUserStatus,
} = require('../controllers/adminController');

// All routes require admin role
router.use(protect, authorize('admin'));

// GET /api/admin/stats
router.get('/stats', getStats);

// GET /api/admin/users?role=student|teacher
router.get('/users', getAllUsers);

// GET /api/admin/classes
router.get('/classes', getAllClasses);

// GET /api/admin/low-attendance?threshold=75
router.get('/low-attendance', getLowAttendanceStudents);

// PUT /api/admin/users/:userId/toggle — activate/deactivate user
router.put('/users/:userId/toggle', toggleUserStatus);

module.exports = router;
