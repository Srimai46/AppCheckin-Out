// backend/src/routes/leaveRoutes.js

const express = require("express");
const router = express.Router();

// ✅ 1. Import Controllers (แยกตามไฟล์ที่เรา Refactor แล้ว)

// 1.1 จัดการคำขอลา (Request, Cancel, Approve, History)
const requestController = require("../controllers/leaves/leaveRequestController");

// 1.2 จัดการโควตา (Quota Balance, Update Quota)
const quotaController = require("../controllers/leaves/leaveQuotaController");

// 1.3 จัดการประเภทวันลา (Leave Types Master Data)
const typeController = require("../controllers/leaves/leaveTypeController");

// 1.4 จัดการระบบ (Year End, Configs)
const systemController = require("../controllers/leaves/leaveSystemController");

// 1.5 จัดการวันหยุด (Holiday)
const { 
  createHoliday, 
  getHolidays, 
  deleteHoliday, 
  updateHoliday 
} = require("../controllers/holidayController");

// Middlewares
const { protect, authorize } = require("../middlewares/authMiddleware");
const { uploadLeaveAttachment } = require("../middlewares/uploadMiddleware");


// ---------------- Leave Type Management (จัดการประเภทวันลา) ----------------

router.get("/types", protect, typeController.getAllLeaveTypes);
router.post("/types", protect, authorize("HR"), typeController.createLeaveType);
router.put("/types/:id", protect, authorize("HR"), typeController.updateLeaveType);
router.delete("/types/:id", protect, authorize("HR"), typeController.deleteLeaveType);

// ---------------- Worker (พนักงานทั่วไป) ----------------

// ดูโควตาตัวเอง
router.get("/my-quota", protect, quotaController.getMyQuotas);
// ดูประวัติการลา
router.get("/my-history", protect, requestController.getMyLeaves);

// ยื่นใบลา (พร้อมแนบไฟล์)
router.post(
  "/",
  protect,
  uploadLeaveAttachment.single("attachment"),
  requestController.createLeaveRequest
);

// ยกเลิกใบลา
router.post("/cancel/:id", protect, requestController.cancelLeaveRequest);

// ---------------- HR (ผู้ดูแลระบบ) ----------------

// ดูรายการลาทั้งหมด (Filter ได้)
router.get("/", protect, authorize("HR"), requestController.getAllLeaves);
// ดูรายการรออนุมัติ
router.get("/pending", protect, authorize("HR"), requestController.getPendingRequests);
// อนุมัติ/ปฏิเสธ
router.patch("/status", protect, authorize("HR"), requestController.updateLeaveStatus);
// อนุมัติกรณีพิเศษ (Special Grant)
router.post("/grant-special", protect, authorize("HR"), requestController.grantSpecialLeave);

// ปรับโควตา (ทั้งบริษัท / รายคน)
router.put("/policy/quotas", protect, authorize("HR"), quotaController.updateCompanyQuotasByType); 
router.put("/policy/quotas/:employeeId", protect, authorize("HR"), quotaController.updateEmployeeQuotasByType); 

// จัดการระบบ (ปิดงวด / Re-open)
router.get("/system-configs", protect, authorize("HR"), systemController.getSystemConfigs);
router.post("/reopen-year", protect, authorize("HR"), systemController.reopenYear);
router.post("/process-carry-over", protect, authorize("HR"), systemController.processCarryOver);
router.put("/system-configs", protect, authorize("HR"), systemController.updateSystemConfig);

// ---------------- Holiday Management (จัดการวันหยุด) ----------------

router.get("/holidays", protect, getHolidays); 
router.post("/holidays", protect, authorize("HR"), createHoliday); 
router.delete("/holidays/:id", protect, authorize("HR"), deleteHoliday); 
router.put("/holidays/:id", protect, authorize("HR"), updateHoliday); 

module.exports = router;
