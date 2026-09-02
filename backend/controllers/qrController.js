const QRSession = require('../models/QRSession');
const Attendance = require('../models/Attendance');
const qrcode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

/**
 * POST /api/qr/generate
 * Teacher starts a class session and gets a QR code image
 */
const generateQR = async (req, res) => {
  try {
    const { classId, sessionTitle } = req.body;

    // Create a unique token for this session
    const qrToken = uuidv4();

    // QR expires in QR_EXPIRY_MINUTES (default 5 min)
    const expiryMinutes = parseInt(process.env.QR_EXPIRY_MINUTES) || 5;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Deactivate any existing active sessions for this class
    await QRSession.updateMany({ classId, isActive: true }, { isActive: false });

    // Create the new QR session record
    const session = await QRSession.create({
      classId,
      teacherId: req.user._id,
      qrToken,
      expiresAt,
      isActive: true,
      sessionTitle: sessionTitle || `Session - ${new Date().toLocaleDateString()}`,
    });

    // Generate QR code as base64 data URL (embeds the token as JSON payload)
    const qrPayload = JSON.stringify({ token: qrToken, sessionId: session._id });
    const qrImage = await qrcode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'H',
      width: 300,
      margin: 2,
      color: { dark: '#1a1a2e', light: '#ffffff' },
    });

    res.status(201).json({
      success: true,
      message: 'QR code generated successfully',
      session: {
        id: session._id,
        qrToken,
        expiresAt,
        expiryMinutes,
        sessionTitle: session.sessionTitle,
        qrImage, // base64 PNG — display directly in <img> tag
      },
    });
  } catch (error) {
    console.error('QR generate error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate QR code' });
  }
};

/**
 * POST /api/qr/verify
 * Verify that a QR token is valid (not expired, session active)
 * Used by students when scanning QR
 */
const verifyQR = async (req, res) => {
  try {
    const { qrToken } = req.body;

    const session = await QRSession.findOne({ qrToken }).populate('classId', 'subjectName subjectCode');

    if (!session) {
      return res.status(404).json({ success: false, message: 'Invalid QR code' });
    }

    if (!session.isActive) {
      return res.status(400).json({ success: false, message: 'This session is no longer active' });
    }

    if (new Date() > session.expiresAt) {
      session.isActive = false;
      await session.save();
      return res.status(400).json({ success: false, message: 'QR code has expired' });
    }

    res.status(200).json({
      success: true,
      message: 'QR code is valid',
      session: {
        id: session._id,
        classId: session.classId._id,
        subjectName: session.classId.subjectName,
        subjectCode: session.classId.subjectCode,
        expiresAt: session.expiresAt,
        sessionTitle: session.sessionTitle,
      },
    });
  } catch (error) {
    console.error('QR verify error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { generateQR, verifyQR };
