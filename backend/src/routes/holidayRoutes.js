//backend/src/routes/holidayRoutes.js
const express = require("express");
const router = express.Router();
const holidayController = require("../controllers/holidayController");
const { protect, authorize } = require("../middlewares/authMiddleware");

// ==========================================
// Holiday Routes (สำหรับ HR จัดการวันหยุด)
// ==========================================

// 1. ดึงรายการวันหยุด (อาจจะให้พนักงานทุกคนดูได้ หรือเฉพาะ HR ก็ได้ตาม Policy)
router.get("/", protect, holidayController.getHolidays);

// 2. สร้างวันหยุดใหม่ (เฉพาะ HR)
router.post("/", protect, authorize("HR"), holidayController.createHoliday);

// 3. แก้ไขวันหยุด (เฉพาะ HR)
router.put("/:id", protect, authorize("HR"), holidayController.updateHoliday);

// 4. ลบวันหยุด (เฉพาะ HR)
router.delete("/:id", protect, authorize("HR"), holidayController.deleteHoliday);

module.exports = router;