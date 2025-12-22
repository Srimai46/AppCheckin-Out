const express = require('express')
const router = express.Router()
const { 
    createLeaveRequest, 
    getMyLeaves,
    getMyQuotas,
    getAllLeaves,
    getPendingRequests,
    updateLeaveStatus,
    updateEmployeeQuota
} = require('../controllers/leaveController')

const { protect, authorize } = require('../middlewares/authMiddleware') 

// --- ส่วนของพนักงานทั่วไป (Worker) ---
// ดึงโควตาคงเหลือ (GET /api/leaves/my-quota)
router.get('/my-quota', protect, getMyQuotas)

// ดูประวัติการลาของตนเอง (GET /api/leaves/my-history)
router.get('/my-history', protect, getMyLeaves)

// ยื่นคำขอลาใหม่ (POST /api/leaves)
router.post('/', protect, createLeaveRequest)


// --- ส่วนของ HR และ Admin (Management) ---
// ดูใบลาของพนักงานทุกคน (GET /api/leaves)
router.get('/', protect, authorize('HR', 'Admin'), getAllLeaves) 

// ดูใบลาที่รออนุมัติ (GET /api/leaves/pending)
router.get('/pending', protect, authorize('HR', 'Admin'), getPendingRequests)

// อนุมัติหรือปฏิเสธใบลา (PATCH /api/leaves/status)
router.patch('/status', protect, authorize('HR', 'Admin'), updateLeaveStatus)

// แก้ไขโควตาพนักงานเฉพาะปีนี้/ปีหน้า (PATCH /api/leaves/quota/:employeeId)
// หมายเหตุ: ใน Controller ต้องรับค่า employeeId จาก req.params
router.patch('/quota/:employeeId', protect, authorize('HR', 'Admin'), updateEmployeeQuota)

module.exports = router