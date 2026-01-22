// backend\src\routes\employeeRoute.js
const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/authMiddleware");

const {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployeeStatus,
  getAttendanceStats,
  resetPassword,
  updateEmployee,
  getDepartments, // ✅ NEW
  getRoles,       // ✅ NEW
} = require("../controllers/employeeController");

// ✅ 0) OPTIONS สำหรับ dropdown (ต้องอยู่ก่อน /:id เสมอ)
router.get("/roles", protect, authorize("HR", "ADMIN"), getRoles);
router.get("/departments", protect, authorize("HR", "ADMIN"), getDepartments);

// ✅ 1) ดึงสถิติภาพรวม (Admin/HR เท่านั้นที่ควรเห็น)
router.get("/stats", protect, authorize("HR", "ADMIN"), getAttendanceStats);

// ✅ (optional) alias ให้ FE ที่เรียก /attendance-stats ก็ใช้ได้
router.get("/attendance-stats", protect, authorize("HR", "ADMIN"), getAttendanceStats);

// ✅ 2) ดึงรายชื่อพนักงานทั้งหมด (HR/Admin)
router.get("/", protect, authorize("HR", "ADMIN"), getAllEmployees);

// ✅ 3) เพิ่มพนักงานใหม่ (Admin/HR)
router.post("/", protect, authorize("HR", "ADMIN"), createEmployee);

// ✅ 4) เปลี่ยนสถานะพนักงาน (Admin/HR)
router.patch("/:id/status", protect, authorize("HR", "ADMIN"), updateEmployeeStatus);

// ✅ 5) รีเซ็ตรหัสผ่านพนักงาน (เจ้าของ/HR/Admin ตาม logic ใน controller)
router.post("/:id/reset-password", protect, resetPassword);

// ✅ 6) แก้ไขข้อมูลพนักงาน (Admin/HR)
router.put("/:id", protect, authorize("HR", "ADMIN"), updateEmployee);

// ✅ 7) ดึงรายละเอียดรายคน (HR หรือ เจ้าของข้อมูล)
// ⚠️ ต้องอยู่ท้ายสุด เพราะชนกับ /roles /departments /stats ได้
router.get("/:id", protect, getEmployeeById);

module.exports = router;
