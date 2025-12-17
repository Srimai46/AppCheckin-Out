const express = require('express')
const router = express.Router()
const { 
    createLeaveRequest, 
    getMyLeaves,
    getMyQuotas,
    getAllLeaves,
    getPendingRequests,
    updateLeaveStatus
} = require('../controllers/leaveController')

// ✅ ตรวจสอบ path ของ middlewares ให้ถูกต้อง
const { protect, authorize } = require('../middlewares/authMiddleware') 

// --- พนักงานทั่วไป (Common / Worker Routes) ---
// ดึงโควตาคงเหลือของตัวเอง
router.get('/my-quota', protect, getMyQuotas)

// ดูประวัติการลาของตัวเอง
router.get('/my-history', protect, getMyLeaves)

// ยื่นคำขอลาใหม่
router.post('/', protect, createLeaveRequest)


// --- สำหรับ HR/Admin (Management Routes) ---
// ดูใบลาทั้งหมด (ใช้สำหรับปฏิทินหรือหน้ารวม)
router.get('/', protect, authorize('HR', 'Admin'), getAllLeaves) 

// ดูเฉพาะใบลาที่รออนุมัติ (Pending)
router.get('/pending', protect, authorize('HR', 'Admin'), getPendingRequests)

// ✅ แก้ไขเป็น PATCH: สำหรับอนุมัติหรือปฏิเสธใบลา
// แนะนำใช้ path '/status' ให้กระชับ หรือคง '/update-status' ตามเดิมก็ได้ครับ
router.patch('/status', protect, authorize('HR', 'Admin'), updateLeaveStatus)

module.exports = router