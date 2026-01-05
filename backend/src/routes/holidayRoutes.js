// backend/src/routes/holidayRoutes.js
const express = require("express");
const router = express.Router();
const holidayController = require("../controllers/holidayController");
const { protect, authorize } = require("../middlewares/authMiddleware");

// ==========================================
// Holiday Routes (สำหรับ HR จัดการวันหยุด)
// ==========================================

// ✅ Working Days Policy (ต้องอยู่ก่อน "/:id" ไม่งั้นชนกัน)
router.get("/working-days", protect, holidayController.getWorkingDaysPolicy);
router.put("/working-days", protect, authorize("HR"), holidayController.saveWorkingDaysPolicy);

// ✅ Max Consecutive Holidays Policy (ต้องอยู่ก่อน "/:id" ไม่งั้นชนกัน)
router.get("/max-consecutive", protect, holidayController.getMaxConsecutivePolicy);
router.put("/max-consecutive", protect, authorize("HR"), holidayController.saveMaxConsecutivePolicy);

// 1. ดึงรายการวันหยุด (อาจจะให้พนักงานทุกคนดูได้ หรือเฉพาะ HR ก็ได้ตาม Policy)
router.get("/", protect, holidayController.getHolidays);

// 2. สร้างวันหยุดใหม่ (เฉพาะ HR)
router.post("/", protect, authorize("HR"), holidayController.createHoliday);

// 3. แก้ไขวันหยุด (เฉพาะ HR)
router.put("/:id", protect, authorize("HR"), holidayController.updateHoliday);

// 4. ลบวันหยุด (เฉพาะ HR)
router.delete("/:id", protect, authorize("HR"), holidayController.deleteHoliday);

module.exports = router;
