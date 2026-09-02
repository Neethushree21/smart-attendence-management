const mongoose = require('mongoose');

/**
 * QRSession Schema - represents a single class session with a time-limited QR code
 */
const qrSessionSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Unique token embedded in the QR code
    qrToken: {
      type: String,
      required: true,
      unique: true,
    },
    // QR code expires after QR_EXPIRY_MINUTES (default 5 min)
    expiresAt: {
      type: Date,
      required: true,
    },
    // Teacher can manually deactivate a session
    isActive: {
      type: Boolean,
      default: true,
    },
    // Optional session title (e.g., "Lecture 1", "Lab Session")
    sessionTitle: {
      type: String,
      default: 'Class Session',
    },
    // Count of students who marked attendance
    attendanceCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('QRSession', qrSessionSchema);
