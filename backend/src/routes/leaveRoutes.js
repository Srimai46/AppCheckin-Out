const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { 
    createLeaveRequest, 
    getMyLeaves,
    getMyQuotas,
    getAllLeaves,
    getPendingRequests,
    updateLeaveStatus,
    updateEmployeeQuota,
    processCarryOver,
    grantSpecialLeave
} = require('../controllers/leaveController');

const { protect, authorize } = require('../middlewares/authMiddleware');
const { uploadLeaveAttachment } = require("../middlewares/uploadMiddleware");

// --- ส่วนของพนักงานทั่วไป (Worker) ---

router.get('/my-quota', protect, getMyQuotas);
router.get('/my-history', protect, getMyLeaves);

// ใช้ Middleware สำหรับอัปโหลดไฟล์แนบ
// router.post('/', protect, uploadAttachment.single('attachment'), createLeaveRequest);
router.post(
  "/leaves",
  uploadLeaveAttachment.single("attachment"),
  async (req, res) => {
    try {
      const {
        selectedType,
        reason,
        startDate,
        endDate,
        duration,
      } = req.body;
      if (!selectedType || !startDate || !endDate) {
        return res.status(400).json({
          message: "ข้อมูลไม่ครบ กรุณาระบุประเภทและช่วงวันที่ลา",
        });
      }

      // ✅ คำนวณจำนวนวันลา
      let totalDaysRequested = 1;
      if (duration === "HalfMorning" || duration === "HalfAfternoon") {
        totalDaysRequested = 0.5;
      } else {
        const start = new Date(startDate);
        const end = new Date(endDate);
        totalDaysRequested =
          Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
      }

      // ✅ ไฟล์แนบ (ถ้ามี)
      const attachmentUrl = req.file
        ? `/uploads/leaves/${req.file.filename}`
        : null;

      // ✅ บันทึกลง DB
      const leave = await prisma.leaveRequest.create({
        data: {
          leaveTypeId: Number(selectedType),
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          reason: reason || null,
          duration,
          totalDaysRequested,
          attachmentUrl,
          status: "Pending",
          employeeId: req.user.id,
        },
      });

      return res.json({
        message: "ส่งคำขอลาสำเร็จ",
        data: leave,
      });
    } catch (err) {
      console.error("Create leave error:", err);
      return res.status(500).json({
        message: err.message || "ไม่สามารถส่งคำขอลาได้",
      });
    }
  }
);

// --- ส่วนของ HR และ Admin (Management) ---

router.get('/', protect, authorize('HR', 'Admin'), getAllLeaves);
router.get('/pending', protect, authorize('HR', 'Admin'), getPendingRequests);
router.patch('/status', protect, authorize('HR', 'Admin'), updateLeaveStatus);
router.patch('/quota/:employeeId', protect, authorize('HR', 'Admin'), updateEmployeeQuota);
router.post('/process-carry-over', protect, authorize('HR', 'Admin'), processCarryOver);
router.post('/grant-special', protect, authorize('HR', 'Admin'), grantSpecialLeave);

router.patch('/type/:id/policy', protect, authorize('HR', 'Admin'), async (req, res) => {
    const { maxCarryOver, maxConsecutiveDays } = req.body;
    const typeId = parseInt(req.params.id);

    try {
        await prisma.leaveType.update({
            where: { id: typeId },
            data: { 
                ...(maxCarryOver !== undefined && { maxCarryOver: parseFloat(maxCarryOver) }),
                ...(maxConsecutiveDays !== undefined && { maxConsecutiveDays: parseInt(maxConsecutiveDays) })
            }
        });
        res.json({ message: "อัปเดตนโยบายการลาสำเร็จ" });
    } catch (e) {
        res.status(500).json({ error: "ไม่สามารถอัปเดตนโยบายได้" });
    }
});

module.exports = router;