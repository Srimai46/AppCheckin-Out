const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { 
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

/**
 * @route   POST /api/leaves
 * @desc    สร้างคำขอลาใหม่ (รองรับไฟล์แนบ)
 */
router.post(
    "/", // แก้จาก /leaves เป็น / เพื่อให้เข้ากับ app.use('/api/leaves', ...)
    protect, 
    uploadLeaveAttachment.single("attachment"),
    async (req, res) => {
        try {
            const {
                type,          // รับ 'type' จาก selectedType ใน frontend
                reason,
                startDate,
                endDate,
                startDuration,
                endDuration,
            } = req.body;

            // 1. Validation เบื้องต้น
            if (!type || !startDate || !endDate) {
                return res.status(400).json({
                    message: "ข้อมูลไม่ครบ กรุณาระบุประเภทและช่วงวันที่ลา",
                });
            }

            // 2. ค้นหา LeaveType ID จาก typeName (Sick, Annual, etc.)
            const leaveType = await prisma.leaveType.findUnique({
                where: { typeName: type }
            });

            if (!leaveType) {
                return res.status(400).json({ message: "ไม่พบประเภทการลาที่ระบุในระบบ" });
            }

            // 3. คำนวณจำนวนวันลาเบื้องต้น
            const start = new Date(startDate);
            const end = new Date(endDate);
            let totalDaysRequested = 0;

            if (start.getTime() === end.getTime()) {
                // กรณีลาวันเดียว
                totalDaysRequested = startDuration === "Full" ? 1 : 0.5;
            } else {
                // กรณีลาหลายวัน (คำนวณแบบหยาบ +1 วัน)
                totalDaysRequested = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
                // ปรับลดถ้าวันแรกหรือวันสุดท้ายลาครึ่งวัน
                if (startDuration !== "Full") totalDaysRequested -= 0.5;
                if (endDuration !== "Full") totalDaysRequested -= 0.5;
            }

            // 4. จัดการ Path ไฟล์แนบ
            const attachmentUrl = req.file
                ? `uploads/attachments/${req.file.filename}`
                : null;

            // 5. บันทึกลงฐานข้อมูล
            const leave = await prisma.leaveRequest.create({
                data: {
                    employeeId: req.user.id,
                    leaveTypeId: leaveType.id,
                    startDate: start,
                    endDate: end,
                    startDuration: startDuration || "Full",
                    endDuration: endDuration || "Full",
                    totalDaysRequested: totalDaysRequested,
                    reason: reason || null,
                    attachmentUrl: attachmentUrl,
                    status: "Pending",
                },
            });

            return res.json({
                message: "ส่งคำขอลาสำเร็จ",
                data: leave,
            });

        } catch (err) {
            console.error("Create leave error:", err);
            return res.status(500).json({
                message: "เกิดข้อผิดพลาดในการส่งคำขอลา",
                error: err.message,
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