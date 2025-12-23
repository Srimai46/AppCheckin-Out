const express = require("express");
const router = express.Router();

const {
  getMyLeaves,
  getMyQuotas,
  getAllLeaves,
  getPendingRequests,
  updateLeaveStatus,
  updateEmployeeQuota,
  processCarryOver,
  grantSpecialLeave,
  createLeaveRequest, // ✅ ใช้ controller ตัวเดียว
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
router.patch("/quota/:employeeId", protect, authorize("HR", "Admin"), updateEmployeeQuota);
router.post("/process-carry-over", protect, authorize("HR", "Admin"), processCarryOver);
router.post("/grant-special", protect, authorize("HR", "Admin"), grantSpecialLeave);

module.exports = router;
