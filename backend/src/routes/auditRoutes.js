// routes/auditRoutes.js
const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticate, authorizeHR } = require('../middlewares/auth');

// ป้องกันให้เฉพาะ HR/Admin เข้าถึงได้
router.get('/', authenticate, authorizeHR, auditController.getAuditLogs);

module.exports = router;