const express = require('express')
const router = express.Router()
const { 
    createLeaveRequest, 
    getMyQuotas, 
    getMyLeaves,
    getPendingRequests,
    updateLeaveStatus
} = require('../controllers/leaveController')
const { protect, authorize } = require('../middlewares/authMiddleware')

// --- Routes สำหรับพนักงานทั่วไป (Worker & HR ก็ใช้ได้) ---
// ดูโควต้าตัวเอง
router.get('/my-quota', protect, getMyQuotas)
// ดูประวัติการลา
router.get('/my-history', protect, getMyLeaves)
// ส่งใบลา
router.post('/request', protect, createLeaveRequest)


// --- Routes สำหรับ HR เท่านั้น ---
// ดูรายการรออนุมัติ
router.get('/pending', protect, authorize('HR'), getPendingRequests)
// กดอนุมัติ/ปฏิเสธ
router.put('/update-status', protect, authorize('HR'), updateLeaveStatus)

module.exports = router