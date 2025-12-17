const express = require('express')
const router = express.Router()

// ✅ นำเข้าฟังก์ชันทั้งหมดจาก Controller (รวมถึง getUserHistory)
const { 
    checkIn, 
    checkOut, 
    getMyHistory, 
    getAllAttendance, 
    getUserHistory 
} = require('../controllers/timeRecordController') 
// ⚠️ หมายเหตุ: ถ้าไฟล์ Controller คุณชื่อ attendanceController.js ให้แก้บรรทัดบนเป็น ../controllers/attendanceController

// ✅ ใช้ Middleware แบบเดิมที่คุณต้องการ (src/middlewares/authMiddleware.js)
const { protect, authorize } = require('../middlewares/authMiddleware') 

// --- User Routes (ทุกคนใช้ได้) ---
router.post('/check-in', protect, checkIn)
router.post('/check-out', protect, checkOut)
router.get('/history', protect, getMyHistory) 

// --- Admin/HR Routes (เฉพาะ HR) ---
router.get('/all-history', protect, authorize('HR'), getAllAttendance)

// ✅ Route สำหรับดูประวัติพนักงานรายคน (ต้องรับ :id)
router.get('/history/user/:id', protect, authorize('HR'), getUserHistory)

module.exports = router