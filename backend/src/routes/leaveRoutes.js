const express = require("express");
const router = express.Router();

// ✅ 1. Import ทุกอย่างจาก leaveController.js ที่เดียว (รวม Type และ Cancel)
const {
  // --- ส่วน Leave Request ---
  getMyLeaves,
  getMyQuotas,
  getAllLeaves,
  getPendingRequests,
  updateLeaveStatus,
  processCarryOver,
  grantSpecialLeave,
  createLeaveRequest,
  cancelLeaveRequest, // เพิ่ม Cancel
  updateCompanyQuotasByType,
  updateEmployeeQuotasByType,
  getSystemConfigs,
  reopenYear,

  // --- ส่วน Leave Type Management ---
  getAllLeaveTypes, // เพิ่ม Get All Types
  createLeaveType,
  updateLeaveType,
  deleteLeaveType
} = require("../controllers/leaveController");

// (ลบ import ซ้ำซ้อนตรง controllers/leave ออกไปได้เลยครับ)

// Controller จัดการวันหยุด (แยกไฟล์ถูกต้องแล้ว)
const { 
  createHoliday, 
  getHolidays, 
  deleteHoliday, 
  updateHoliday 
} = require("../controllers/holidayController");

const { protect, authorize } = require("../middlewares/authMiddleware");
const { uploadLeaveAttachment } = require("../middlewares/uploadMiddleware");

// ============================================================
// ---------------- Leave Type Management (จัดการประเภทวันลา) ----------------
// ============================================================
router.get("/types", protect, getAllLeaveTypes);
router.post("/types", protect, authorize("HR"), createLeaveType);
router.put("/types/:id", protect, authorize("HR"), updateLeaveType);
router.delete("/types/:id", protect, authorize("HR"), deleteLeaveType);

// ============================================================
// ---------------- Worker (พนักงานทั่วไป) ----------------
// ============================================================
router.get("/my-quota", protect, getMyQuotas);
router.get("/my-history", protect, getMyLeaves);

router.post(
  "/",
  protect,
  uploadLeaveAttachment.single("attachment"),
  createLeaveRequest 
);

// ✅ เพิ่ม Route ยกเลิกใบลา (Cancel)
router.post("/cancel/:id", protect, cancelLeaveRequest);

// ============================================================
// ---------------- HR (ผู้ดูแลระบบ) ----------------
// ============================================================
router.get("/", protect, authorize("HR"), getAllLeaves);
router.get("/pending", protect, authorize("HR"), getPendingRequests);
router.patch("/status", protect, authorize("HR"), updateLeaveStatus);
router.post("/process-carry-over", protect, authorize("HR"), processCarryOver);
router.post("/grant-special", protect, authorize("HR"), grantSpecialLeave);
router.put("/policy/quotas", protect, authorize("HR"), updateCompanyQuotasByType); 
router.put("/policy/quotas/:employeeId", protect, authorize("HR"), updateEmployeeQuotasByType); 
router.get("/system-configs", protect, authorize("HR"), getSystemConfigs);
router.post("/reopen-year", protect, authorize("HR"), reopenYear);

// ============================================================
// ---------------- Holiday Management (จัดการวันหยุด) ----------------
// ============================================================
router.get("/holidays", protect, getHolidays); 
router.post("/holidays", protect, authorize("HR"), createHoliday); 
router.delete("/holidays/:id", protect, authorize("HR"), deleteHoliday); 
router.put("/holidays/:id", protect, authorize("HR"), updateHoliday); 

module.exports = router;