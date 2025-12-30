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
  cancelLeaveRequest,
  updateLeaveRequest,
  updateCompanyQuotasByType,
  updateEmployeeQuotasByType,
  getSystemConfigs,
  reopenYear,
} = require("../controllers/leaveController");

const { protect, authorize } = require("../middlewares/authMiddleware");
const { uploadLeaveAttachment } = require("../middlewares/uploadMiddleware");

const {
  createHoliday,
  getHolidays,
  deleteHoliday,
  updateHoliday,
} = require("../controllers/holidayController");

// ---------------- Worker ----------------
router.get("/my-quota", protect, getMyQuotas);
router.get("/my-history", protect, getMyLeaves);

// ✅ Create leave request
router.post(
  "/",
  protect,
  uploadLeaveAttachment.single("attachment"),
  createLeaveRequest
);

router.patch(
  "/:id",
  protect,
  uploadLeaveAttachment.single("attachment"),
  updateLeaveRequest
);

router.patch(
  "/:id/cancel",
  protect,
  cancelLeaveRequest
);

// ✅ Cancel / Delete leave request (Worker)  <<< FE เรียก /leaves/:id/cancel
router.patch("/:id/cancel", protect, cancelLeaveRequest);
// ✅ Edit leave request (Worker) — แก้ได้เฉพาะ Pending
// ถ้ายังไม่ทำ controller ตัวนี้ ให้คอมเมนต์บรรทัดนี้ไว้ก่อน
router.patch("/:id", protect, uploadLeaveAttachment.single("attachment"), updateLeaveRequest);



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
