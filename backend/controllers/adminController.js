const User = require('../models/User');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const QRSession = require('../models/QRSession');

/**
 * GET /api/admin/stats
 * Overall system statistics for the admin dashboard
 */
const getStats = async (req, res) => {
  try {
    const [totalStudents, totalTeachers, totalClasses, totalSessions, totalAttendance] =
      await Promise.all([
        User.countDocuments({ role: 'student' }),
        User.countDocuments({ role: 'teacher' }),
        Class.countDocuments({ isActive: true }),
        QRSession.countDocuments(),
        Attendance.countDocuments({ status: 'present' }),
      ]);

    // Daily attendance trend (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyTrend = await Attendance.aggregate([
      { $match: { date: { $gte: sevenDaysAgo }, status: 'present' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Attendance per subject
    const subjectAttendance = await Attendance.aggregate([
      { $match: { status: 'present' } },
      {
        $group: {
          _id: '$classId',
          presentCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'classes',
          localField: '_id',
          foreignField: '_id',
          as: 'class',
        },
      },
      { $unwind: '$class' },
      {
        $project: {
          subjectName: '$class.subjectName',
          subjectCode: '$class.subjectCode',
          presentCount: 1,
        },
      },
      { $sort: { presentCount: -1 } },
      { $limit: 10 },
    ]);

    // Overall attendance rate
    const possibleAttendance = await Attendance.countDocuments();
    const overallRate =
      possibleAttendance > 0 ? Math.round((totalAttendance / possibleAttendance) * 100) : 0;

    res.status(200).json({
      success: true,
      stats: {
        totalStudents,
        totalTeachers,
        totalClasses,
        totalSessions,
        totalAttendance,
        overallRate,
      },
      dailyTrend,
      subjectAttendance,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/admin/users
 * Get all users with optional role filter
 */
const getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = role ? { role } : {};

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/admin/low-attendance
 * Find students with attendance below threshold (default 75%)
 */
const getLowAttendanceStudents = async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 75;

    // Get all active classes
    const classes = await Class.find({ isActive: true }).lean();

    const lowAttendanceList = [];

    for (const cls of classes) {
      const totalSessions = await QRSession.countDocuments({ classId: cls._id });
      if (totalSessions === 0) continue;

      for (const studentId of cls.studentIds) {
        const attended = await Attendance.countDocuments({
          studentId,
          classId: cls._id,
          status: 'present',
        });

        const percentage = Math.round((attended / totalSessions) * 100);

        if (percentage < threshold) {
          const student = await User.findById(studentId)
            .select('name email rollNumber department semester')
            .lean();

          if (student) {
            lowAttendanceList.push({
              student,
              subjectName: cls.subjectName,
              subjectCode: cls.subjectCode,
              classId: cls._id,
              attended,
              totalSessions,
              percentage,
            });
          }
        }
      }
    }

    // Sort by percentage ascending
    lowAttendanceList.sort((a, b) => a.percentage - b.percentage);

    res.status(200).json({ success: true, threshold, count: lowAttendanceList.length, students: lowAttendanceList });
  } catch (error) {
    console.error('Low attendance error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/admin/classes
 * Get all classes with teacher info
 */
const getAllClasses = async (req, res) => {
  try {
    const classes = await Class.find()
      .populate('teacherId', 'name email employeeId')
      .lean();

    const enriched = await Promise.all(
      classes.map(async (cls) => {
        const sessions = await QRSession.countDocuments({ classId: cls._id });
        const enrolled = cls.studentIds.length;
        return { ...cls, totalSessions: sessions, totalEnrolled: enrolled };
      })
    );

    res.status(200).json({ success: true, count: enriched.length, classes: enriched });
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * PUT /api/admin/users/:userId/toggle
 * Activate or deactivate a user
 */
const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getStats, getAllUsers, getLowAttendanceStudents, getAllClasses, toggleUserStatus };
