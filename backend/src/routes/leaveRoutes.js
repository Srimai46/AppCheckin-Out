const express = require("express");
const router = express.Router();

// Controller หลักเกี่ยวกับการลา
const {
  getMyLeaves,
  getMyQuotas,
  getAllLeaves,
  getPendingRequests,
  updateLeaveStatus,
  processCarryOver,
  grantSpecialLeave,
  createLeaveRequest,
  updateCompanyQuotasByType,
  updateEmployeeQuotasByType,
  getSystemConfigs,
  reopenYear,
} = require("../controllers/leaveController");

// ✅ Import Controller จัดการประเภทวันลา (ที่เราเพิ่งสร้าง)
const {
  getAllLeaveTypes,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType
} = require("../controllers/leaveTypeController");

// Controller จัดการวันหยุด
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
// GET: ดึงประเภทวันลาทั้งหมด (พนักงานทุกคนต้องเห็น เพื่อเลือกตอนลา)
router.get("/types", protect, getAllLeaveTypes);

// POST: สร้างประเภทวันลาใหม่ (เฉพาะ HR)
router.post("/types", protect, authorize("HR"), createLeaveType);

// PUT: แก้ไขประเภทวันลา (เฉพาะ HR)
router.put("/types/:id", protect, authorize("HR"), updateLeaveType);

// DELETE: ลบประเภทวันลา (เฉพาะ HR)
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