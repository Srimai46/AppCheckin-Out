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
    updateEmployee
} = require("../controllers/employeeController");

// 1. ดึงสถิติภาพรวม (Admin/HR เท่านั้นที่ควรเห็น)
router.get("/stats", protect, authorize("HR"), getAttendanceStats);

// 2. ดึงรายชื่อพนักงานทั้งหมด (HR)
router.get("/", protect, authorize("HR"), getAllEmployees);

// 3. ดึงรายละเอียดรายคน (HR หรือ เจ้าของข้อมูล)
router.get("/:id", protect, getEmployeeById);

// 4. เพิ่มพนักงานใหม่ (Admin/HR)
router.post("/", protect, authorize("HR"), createEmployee);

// 5. เปลี่ยนสถานะพนักงาน (Admin/HR)
router.patch("/:id/status", protect, authorize("HR"), updateEmployeeStatus);

// 6. รีเซ็ตรหัสผ่านพนักงาน 
// ไม่ใส่ authorize เพราะต้องการให้พนักงานทั่วไป (Worker) เปลี่ยนรหัสตัวเองได้ด้วย
// แต่ Logic ภายใน controller ต้องเช็คว่า (id == requesterId || role == HR)
router.post("/:id/reset-password", protect, resetPassword); 

// 7. แก้ไขข้อมูลพนักงาน (ชื่อ-นามสกุล/อีเมล/role) - PUT (Admin/HR)
router.put("/:id", protect, authorize("HR"), updateEmployee);

module.exports = router;