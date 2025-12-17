const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/authMiddleware");
const { 
    getAllEmployees, 
    getEmployeeById, 
    createEmployee, 
    updateEmployeeStatus 
} = require("../controllers/employeeController");

// 1. ดึงรายชื่อพนักงานทั้งหมด
router.get("/", protect, getAllEmployees);

// 2. ดึงรายละเอียดรายคน
router.get("/:id", protect, getEmployeeById);

// 3. เพิ่มพนักงานใหม่ (Admin/HR)
router.post("/", protect, authorize("Admin", "HR"), createEmployee);

// 4. เปลี่ยนสถานะพนักงาน (Admin/HR)
router.patch("/:id/status", protect, authorize("Admin", "HR"), updateEmployeeStatus);

module.exports = router;