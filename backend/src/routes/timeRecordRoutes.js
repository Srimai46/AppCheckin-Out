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
  updateWorkConfig, 
  getWorkConfigs,
} = require("../controllers/timeRecordController");

// ✅ 2. เหลือไว้เฉพาะ getAuditLogs (ถ้าคุณวางไว้ใน auditController)
const { getAuditLogs } = require("../controllers/auditController");

const { protect, authorize } = require("../middlewares/authMiddleware");

// --- User Routes ---
router.post("/check-in", protect, checkIn);
router.post("/check-out", protect, checkOut);
router.get("/history", protect, getMyHistory);

// --- HR Routes ---
router.get("/all-history", protect, authorize("HR" , "ADMIN"), getAllAttendance);
router.get("/history/user/:id", protect, authorize("HR" , "ADMIN"), getUserHistory);

// Team Dashboard & Manual Actions
router.get("/team/today", protect, authorize("HR" , "ADMIN"), getTeamTodayAttendance);
router.post("/team/:employeeId/check-in", protect, authorize("HR" , "ADMIN"), hrCheckInEmployee);
router.post("/team/:employeeId/check-out", protect, authorize("HR" , "ADMIN"), hrCheckOutEmployee);

// ✅ 3. ตั้ง Route ให้เรียกใช้ฟังก์ชันจากที่ Import มาด้านบน
router.get("/activities", protect, authorize("HR" , "ADMIN"), getAuditLogs); 
router.put("/work-config", protect, authorize("HR" , "ADMIN"), updateWorkConfig);
router.get("/work-config", protect, authorize("HR" , "ADMIN"), getWorkConfigs);

module.exports = router;