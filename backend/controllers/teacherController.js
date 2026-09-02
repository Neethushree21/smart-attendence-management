const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const QRSession = require('../models/QRSession');
const User = require('../models/User');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');
const fs = require('fs');

/**
 * POST /api/teacher/classes
 * Create a new class/subject
 */
const createClass = async (req, res) => {
  try {
    const { subjectName, subjectCode, department, semester } = req.body;

    const newClass = await Class.create({
      subjectName,
      subjectCode,
      department,
      semester,
      teacherId: req.user._id,
    });

    res.status(201).json({ success: true, message: 'Class created successfully', class: newClass });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Subject code already exists' });
    }
    console.error('Create class error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/teacher/classes
 * Get all classes created by this teacher
 */
const getClasses = async (req, res) => {
  try {
    const classes = await Class.find({ teacherId: req.user._id, isActive: true })
      .populate('studentIds', 'name email rollNumber')
      .lean();

    // Add session count and attendance stats per class
    const enrichedClasses = await Promise.all(
      classes.map(async (cls) => {
        const totalSessions = await QRSession.countDocuments({ classId: cls._id });
        return { ...cls, totalSessions };
      })
    );

    res.status(200).json({ success: true, classes: enrichedClasses });
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/teacher/classes/:classId/students
 * Add students to a class
 */
const addStudentsToClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const { studentIds } = req.body; // array of student IDs or emails

    const cls = await Class.findOne({ _id: classId, teacherId: req.user._id });
    if (!cls) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    // Add students (avoid duplicates)
    let addedStudents = [];
    for (const studentId of studentIds) {
      if (!cls.studentIds.includes(studentId)) {
        cls.studentIds.push(studentId);
        addedStudents.push(studentId);
      }
    }
    await cls.save();

    res.status(200).json({ success: true, message: `${addedStudents.length} student(s) added`, class: cls });
  } catch (error) {
    console.error('Add students error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/teacher/sessions
 * Get all QR sessions created by this teacher
 */
const getSessions = async (req, res) => {
  try {
    const sessions = await QRSession.find({ teacherId: req.user._id })
      .populate('classId', 'subjectName subjectCode')
      .sort({ createdAt: -1 })
      .lean();

    // Add attendance count per session
    const enriched = await Promise.all(
      sessions.map(async (s) => {
        const count = await Attendance.countDocuments({ sessionId: s._id, status: 'present' });
        const isExpired = new Date() > new Date(s.expiresAt);
        return { ...s, attendanceCount: count, isExpired };
      })
    );

    res.status(200).json({ success: true, sessions: enriched });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/teacher/attendance/:classId
 * Get attendance records for a class (with CSV download option)
 */
const getClassAttendance = async (req, res) => {
  try {
    const { classId } = req.params;
    const { download } = req.query;

    // Verify teacher owns this class
    const cls = await Class.findOne({ _id: classId, teacherId: req.user._id })
      .populate('studentIds', 'name email rollNumber department semester')
      .lean();

    if (!cls) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    // Get all sessions for this class
    const sessions = await QRSession.find({ classId }).sort({ createdAt: 1 }).lean();

    // Build attendance matrix: rows = students, columns = sessions
    const matrix = await Promise.all(
      cls.studentIds.map(async (student) => {
        const sessionData = await Promise.all(
          sessions.map(async (session) => {
            const record = await Attendance.findOne({
              studentId: student._id,
              sessionId: session._id,
            }).lean();
            return { sessionId: session._id, date: session.createdAt, present: !!record };
          })
        );

        const totalPresent = sessionData.filter((s) => s.present).length;
        const percentage = sessions.length > 0 ? Math.round((totalPresent / sessions.length) * 100) : 0;

        return {
          student,
          sessions: sessionData,
          totalPresent,
          totalSessions: sessions.length,
          percentage,
        };
      })
    );

    // CSV Download
    if (download === 'csv') {
      const tmpDir = path.join(__dirname, '..', 'tmp');
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

      const fileName = `attendance_${classId}_${Date.now()}.csv`;
      const filePath = path.join(tmpDir, fileName);

      const headers = [
        { id: 'name', title: 'Student Name' },
        { id: 'rollNumber', title: 'Roll Number' },
        { id: 'email', title: 'Email' },
        { id: 'totalPresent', title: 'Classes Attended' },
        { id: 'totalSessions', title: 'Total Sessions' },
        { id: 'percentage', title: 'Attendance %' },
      ];

      const csvWriter = createObjectCsvWriter({ path: filePath, header: headers });
      const records = matrix.map((r) => ({
        name: r.student.name,
        rollNumber: r.student.rollNumber || 'N/A',
        email: r.student.email,
        totalPresent: r.totalPresent,
        totalSessions: r.totalSessions,
        percentage: `${r.percentage}%`,
      }));

      await csvWriter.writeRecords(records);

      res.download(filePath, `${cls.subjectCode}_attendance.csv`, () => {
        fs.unlinkSync(filePath); // Clean up temp file after download
      });
      return;
    }

    res.status(200).json({
      success: true,
      class: { subjectName: cls.subjectName, subjectCode: cls.subjectCode },
      sessions: sessions.map((s) => ({ id: s._id, title: s.sessionTitle, date: s.createdAt })),
      attendance: matrix,
    });
  } catch (error) {
    console.error('Get class attendance error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/teacher/students
 * Get all registered students (so teacher can add to class)
 */
const getAllStudents = async (req, res) => {
  try {
    const students = await User.find({ role: 'student', isActive: true })
      .select('name email rollNumber department semester')
      .lean();
    res.status(200).json({ success: true, students });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { createClass, getClasses, addStudentsToClass, getSessions, getClassAttendance, getAllStudents };
