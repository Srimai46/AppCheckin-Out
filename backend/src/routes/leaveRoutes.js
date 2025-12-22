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
const { uploadAttachment } = require('../middlewares/uploadMiddleware'); // ✅ Import Middleware สำหรับอัปโหลด

// --- ส่วนของพนักงานทั่วไป (Worker) ---

router.get('/my-quota', protect, getMyQuotas);
router.get('/my-history', protect, getMyLeaves);

// ใช้ Middleware สำหรับอัปโหลดไฟล์แนบ
router.post('/', protect, uploadAttachment.single('attachment'), createLeaveRequest);


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