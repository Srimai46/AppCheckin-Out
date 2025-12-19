const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/authMiddleware");
const { 
    getAllEmployees, 
    getEmployeeById, 
    createEmployee, 
    updateEmployeeStatus,
    getAttendanceStats,
    resetPassword
} = require("../controllers/employeeController");

// 1. ดึงสถิติภาพรวม (เช็คอิน, มาสาย) 
// วางไว้ก่อน /:id เพราะไม่งั้น Express จะคิดว่า "stats" คือ ID ของพนักงาน
router.get("/stats", protect, getAttendanceStats);

// 2. ดึงรายชื่อพนักงานทั้งหมด
router.get("/", protect, getAllEmployees);

// 3. ดึงรายละเอียดรายคน
router.get("/:id", protect, getEmployeeById);

// 4. เพิ่มพนักงานใหม่ (Admin/HR)
router.post("/", protect, authorize("Admin", "HR"), createEmployee);

// 5. เปลี่ยนสถานะพนักงาน (Admin/HR)
router.patch("/:id/status", protect, authorize("Admin", "HR"), updateEmployeeStatus);

// 6. รีเซ็ตรหัสผ่านพนักงาน (Admin/HR)
router.post("/:id/reset-password", protect, authorize("Admin", "HR"), resetPassword);

module.exports = router;