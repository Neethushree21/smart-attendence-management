const Attendance = require('../models/Attendance');
const QRSession = require('../models/QRSession');
const Class = require('../models/Class');

/**
 * POST /api/attendance/mark
 * Student marks attendance by submitting a QR token
 * Validates: QR valid → not expired → student enrolled → no duplicate
 */
const markAttendance = async (req, res) => {
  try {
    const { qrToken } = req.body;
    const studentId = req.user._id;

    // 1. Find the QR session
    const session = await QRSession.findOne({ qrToken });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Invalid QR code — session not found' });
    }

    // 2. Check if session is still active
    if (!session.isActive) {
      return res.status(400).json({ success: false, message: 'This session has been closed by the teacher' });
    }

    // 3. Check expiry
    if (new Date() > session.expiresAt) {
      session.isActive = false;
      await session.save();
      return res.status(400).json({ success: false, message: 'QR code has expired. Please ask teacher to generate a new one.' });
    }

    // 4. Check if student is enrolled in the class
    const cls = await Class.findOne({ _id: session.classId, studentIds: studentId });
    if (!cls) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this class',
      });
    }

    // 5. Prevent duplicate attendance (unique index on studentId + sessionId)
    const existingRecord = await Attendance.findOne({ studentId, sessionId: session._id });
    if (existingRecord) {
      return res.status(409).json({
        success: false,
        message: 'Attendance already marked for this session',
      });
    }

    // 6. Create attendance record
    const attendance = await Attendance.create({
      studentId,
      classId: session.classId,
      sessionId: session._id,
      status: 'present',
      markedAt: new Date(),
    });

    // 7. Increment session attendance count
    session.attendanceCount = (session.attendanceCount || 0) + 1;
    await session.save();

    res.status(201).json({
      success: true,
      message: '✅ Attendance marked successfully!',
      attendance: {
        id: attendance._id,
        classId: session.classId,
        sessionId: session._id,
        status: 'present',
        markedAt: attendance.markedAt,
      },
    });
  } catch (error) {
    // Handle MongoDB duplicate key error as fallback
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Attendance already marked for this session' });
    }
    console.error('Mark attendance error:', error);
    res.status(500).json({ success: false, message: 'Server error while marking attendance' });
  }
};

/**
 * GET /api/attendance/:studentId
 * Get all attendance records for a student (admin or the student themselves)
 */
const getStudentAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Students can only view their own records
    if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const records = await Attendance.find({ studentId })
      .populate('classId', 'subjectName subjectCode')
      .populate('sessionId', 'sessionTitle createdAt expiresAt')
      .sort({ date: -1 })
      .lean();

    res.status(200).json({ success: true, count: records.length, records });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { markAttendance, getStudentAttendance };
