const express = require("express");
const router = express.Router();

const {
  checkIn,
  checkOut,
  getMyHistory,
  getAllAttendance,
  getUserHistory,

  // ✅ NEW (ต้องมีใน controller)
  getTeamTodayAttendance,
  hrCheckInEmployee,
  hrCheckOutEmployee,
} = require("../controllers/timeRecordController");

const { protect, authorize } = require("../middlewares/authMiddleware");

// --- User Routes (ทุกคนใช้ได้) ---
router.post("/check-in", protect, checkIn);
router.post("/check-out", protect, checkOut);
router.get("/history", protect, getMyHistory);

// --- HR Routes (เฉพาะ HR) ---
router.get("/all-history", protect, authorize("HR"), getAllAttendance);
router.get("/history/user/:id", protect, authorize("HR"), getUserHistory);

// ✅ TEAM TODAY + HR actions
router.get("/team/today", protect, authorize("HR"), getTeamTodayAttendance);
router.post("/team/:employeeId/check-in", protect, authorize("HR"), hrCheckInEmployee);
router.post("/team/:employeeId/check-out", protect, authorize("HR"), hrCheckOutEmployee);

module.exports = router;
