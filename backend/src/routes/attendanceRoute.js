// backend/src/routes/attendanceRoute.js

const express = require("express");
const router = express.Router();
const attendanceStatsController = require("../controllers/attendanceStatsController"); // Import ไฟล์ตะกี้
const { authenticateUser } = require("../middlewares/authMiddleware");

// GET /api/attendance/stats
router.get("/stats", authenticateUser, attendanceStatsController.getStats);

module.exports = router;