const express = require("express");
const router = express.Router();

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

const { protect, authorize } = require("../middlewares/authMiddleware");
const { uploadLeaveAttachment } = require("../middlewares/uploadMiddleware");

// ✅ ดึงฟังก์ชันจัดการวันหยุดมาจากไฟล์ที่ถูกต้อง
const { 
  createHoliday, 
  getHolidays, 
  deleteHoliday, 
  updateHoliday 
} = require("../controllers/holidayController");

// ---------------- Worker ----------------
router.get("/my-quota", protect, getMyQuotas);
router.get("/my-history", protect, getMyLeaves);

router.post(
  "/",
  protect,
  uploadLeaveAttachment.single("attachment"),
  createLeaveRequest 
);

// ---------------- HR ----------------
router.get("/", protect, authorize("HR"), getAllLeaves);
router.get("/pending", protect, authorize("HR"), getPendingRequests);
router.patch("/status", protect, authorize("HR"), updateLeaveStatus);
router.post("/process-carry-over", protect, authorize("HR"), processCarryOver);
router.post("/grant-special", protect, authorize("HR"), grantSpecialLeave);
router.put("/policy/quotas", protect, authorize("HR"), updateCompanyQuotasByType); 
router.put("/policy/quotas/:employeeId", protect, authorize("HR"), updateEmployeeQuotasByType); 
router.get("/system-configs", protect, authorize("HR"), getSystemConfigs);
router.post("/reopen-year", protect, authorize("HR"), reopenYear);

// ---------------- Holiday Management ----------------
router.get("/holidays", protect, getHolidays); 
router.post("/holidays", protect, authorize("HR"), createHoliday); 
router.delete("/holidays/:id", protect, authorize("HR"), deleteHoliday); 
router.put("/holidays/:id", protect, authorize("HR"), updateHoliday); 

module.exports = router;