const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');

const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/history', protect, authorize("HR"), auditController.getAuditLogs);

module.exports = router;