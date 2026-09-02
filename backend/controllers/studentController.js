const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const QRSession = require('../models/QRSession');

/**
 * GET /api/student/dashboard
 * Returns student's enrolled classes with attendance percentages
 */
const getDashboard = async (req, res) => {
  try {
    const studentId = req.user._id;

    // Find all classes where student is enrolled
    const classes = await Class.find({ studentIds: studentId, isActive: true })
      .populate('teacherId', 'name email')
      .lean();

    // For each class, calculate attendance percentage
    const dashboardData = await Promise.all(
      classes.map(async (cls) => {
        // Total sessions for this class
        const totalSessions = await QRSession.countDocuments({ classId: cls._id });

        // Sessions student attended
        const attended = await Attendance.countDocuments({
          studentId,
          classId: cls._id,
          status: 'present',
        });

        const percentage = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0;

        return {
          classId: cls._id,
          subjectName: cls.subjectName,
          subjectCode: cls.subjectCode,
          teacher: cls.teacherId ? cls.teacherId.name : 'N/A',
          totalSessions,
          attended,
          percentage,
          isLow: percentage < 75,
        };
      })
    );

    // Overall stats
    const totalClasses = dashboardData.length;
    const avgAttendance =
      totalClasses > 0
        ? Math.round(dashboardData.reduce((sum, c) => sum + c.percentage, 0) / totalClasses)
        : 0;
    const lowAttendanceCount = dashboardData.filter((c) => c.isLow).length;

    res.status(200).json({
      success: true,
      student: {
        name: req.user.name,
        email: req.user.email,
        rollNumber: req.user.rollNumber,
        department: req.user.department,
        semester: req.user.semester,
      },
      stats: { totalClasses, avgAttendance, lowAttendanceCount },
      classes: dashboardData,
    });
  } catch (error) {
    console.error('Student dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/student/attendance/:classId
 * Returns full attendance history for a student in a specific class
 */
const getAttendanceHistory = async (req, res) => {
  try {
    const studentId = req.user._id;
    const { classId } = req.params;

    const records = await Attendance.find({ studentId, classId })
      .populate('sessionId', 'sessionTitle createdAt expiresAt')
      .sort({ date: -1 })
      .lean();

    const classInfo = await Class.findById(classId).populate('teacherId', 'name').lean();

    res.status(200).json({
      success: true,
      class: classInfo
        ? { subjectName: classInfo.subjectName, subjectCode: classInfo.subjectCode }
        : null,
      records,
    });
  } catch (error) {
    console.error('Attendance history error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getDashboard, getAttendanceHistory };
