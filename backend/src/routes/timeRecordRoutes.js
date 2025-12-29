const express = require("express");
const router = express.Router();

const {
  checkIn,
  checkOut,
  getMyHistory,
  getAllAttendance,
  getUserHistory,
  getTeamTodayAttendance,
  hrCheckInEmployee,
  hrCheckOutEmployee,
} = require("../controllers/timeRecordController");

// ✅ Import เพิ่มจาก Controller ที่จัดการเรื่อง Audit และ Config
const { getAuditLogs } = require("../controllers/auditController");
const { updateWorkConfig } = require("../controllers/configController"); 

const { protect, authorize } = require("../middlewares/authMiddleware");

// --- User Routes (ทุกคนใช้ได้) ---
router.post("/check-in", protect, checkIn);
router.post("/check-out", protect, checkOut);
router.get("/history", protect, getMyHistory);

// --- HR Routes (เฉพาะ HR) ---
router.get("/all-history", protect, authorize("HR"), getAllAttendance);
router.get("/history/user/:id", protect, authorize("HR"), getUserHistory);

// Team Dashboard & Manual Actions
router.get("/team/today", protect, authorize("HR"), getTeamTodayAttendance);
router.post("/team/:employeeId/check-in", protect, authorize("HR"), hrCheckInEmployee);
router.post("/team/:employeeId/check-out", protect, authorize("HR"), hrCheckOutEmployee);

// ใช้ /activities เพื่อเลี่ยง AdBlocker บล็อกคำว่า 'audit'
router.get("/activities", protect, authorize("HR"), getAuditLogs); 
router.put("/work-config", protect, authorize("HR"), updateWorkConfig);

module.exports = router;