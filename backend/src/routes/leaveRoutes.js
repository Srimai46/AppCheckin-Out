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

// ---------------- Worker ----------------
router.get("/my-quota", protect, getMyQuotas);
router.get("/my-history", protect, getMyLeaves);

/**
 * @route   POST /api/leaves
 * @desc    สร้างคำขอลาใหม่ (รองรับไฟล์แนบ)
 */
router.post(
  "/",
  protect,
  uploadLeaveAttachment.single("attachment"),
  createLeaveRequest // ✅ เรียก controller อย่างเดียว
);

// ---------------- HR / Admin ----------------
router.get("/", protect, authorize("HR", "Admin"), getAllLeaves);
router.get("/pending", protect, authorize("HR", "Admin"), getPendingRequests);
router.patch("/status", protect, authorize("HR", "Admin"), updateLeaveStatus);
router.post("/process-carry-over", protect, authorize("HR", "Admin"), processCarryOver);
router.post("/grant-special", protect, authorize("HR", "Admin"), grantSpecialLeave);
router.put("/policy/quotas", protect, authorize("HR", "Admin"), updateCompanyQuotasByType ); // ✅ ปรับทั้งบริษัท (แยกประเภท)
router.put("/policy/quotas/:employeeId", protect, authorize("HR", "Admin"), updateEmployeeQuotasByType ); // ✅ ปรับรายคน (แยกประเภทหลายอัน)
router.get("/system-configs", protect, authorize("HR", "Admin"), getSystemConfigs);
router.post("/reopen-year", protect, authorize("HR", "Admin"), reopenYear);

module.exports = router;
