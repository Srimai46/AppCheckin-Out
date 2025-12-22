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
    grantSpecialLeave // ✅ เพิ่มใหม่
} = require('../controllers/leaveController');

const { protect, authorize } = require('../middlewares/authMiddleware');

// --- Worker Routes ---
router.get('/my-quota', protect, getMyQuotas);
router.get('/my-history', protect, getMyLeaves);
router.post('/', protect, createLeaveRequest);

// --- HR & Admin Routes ---
router.get('/', protect, authorize('HR', 'Admin'), getAllLeaves);
router.get('/pending', protect, authorize('HR', 'Admin'), getPendingRequests);
router.patch('/status', protect, authorize('HR', 'Admin'), updateLeaveStatus);
router.patch('/quota/:employeeId', protect, authorize('HR', 'Admin'), updateEmployeeQuota);
router.post('/process-carry-over', protect, authorize('HR', 'Admin'), processCarryOver);

// ✅ เพิ่ม: มอบวันลาพิเศษรายกรณี
router.post('/grant-special', protect, authorize('HR', 'Admin'), grantSpecialLeave);

// ✅ แก้ไข/เพิ่ม: จัดการนโยบายประเภทการลา (Limit ทบวัน และ Limit ลาติดต่อกัน)
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