const mongoose = require('mongoose');

/**
 * Attendance Schema - records each student's attendance for a session
 * Unique constraint on (studentId + sessionId) prevents duplicate entries
 */
const attendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    // Each session is linked to a QRSession
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QRSession',
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['present', 'absent'],
      default: 'present',
    },
    // Store the IP or device info for fraud detection
    markedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Prevent a student from marking attendance twice for the same session
attendanceSchema.index({ studentId: 1, sessionId: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
