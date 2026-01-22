// backend/src/routes/departmentRoutes.js
const express = require("express");
const router = express.Router();
const departmentController = require("../controllers/departmentController");
const { protect, authorize } = require("../middlewares/authMiddleware");

// ทุก Route ต้อง Login ก่อน (protect)

// ดูรายการแผนก (ทุกคนดูได้ หรือจำกัดแค่ HR ก็ได้ ตาม requirements)
router.get("/", protect, departmentController.getAllDepartments);

// เพิ่ม / แก้ไข / ลบ (เฉพาะ ADMIN และ HR เท่านั้น)
router.post("/", protect, authorize("ADMIN", "HR"), departmentController.createDepartment);
router.put("/:id", protect, authorize("ADMIN", "HR"), departmentController.updateDepartment);
router.delete("/:id", protect, authorize("ADMIN", "HR"), departmentController.deleteDepartment);

module.exports = router;