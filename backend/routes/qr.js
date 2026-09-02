const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { generateQR, verifyQR } = require('../controllers/qrController');

// POST /api/qr/generate — teacher generates QR for a session
router.post(
  '/generate',
  protect,
  authorize('teacher'),
  [body('classId').notEmpty().withMessage('Class ID is required')],
  validate,
  generateQR
);

// POST /api/qr/verify — verify a QR token (student or public)
router.post(
  '/verify',
  [body('qrToken').notEmpty().withMessage('QR token is required')],
  validate,
  verifyQR
);

module.exports = router;
