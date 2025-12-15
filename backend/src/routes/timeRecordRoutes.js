const express = require('express')
const router = express.Router()

// 1. เพิ่ม getAllAttendance เข้าไปในปีกกา
const { checkIn, checkOut, getMyHistory, getAllAttendance } = require('../controllers/timeRecordController')

// 2. เพิ่ม authorize เข้าไปในปีกกา
const { protect, authorize } = require('../middlewares/authMiddleware')

// ทุก Route ในนี้ต้อง Login ก่อน (ผ่าน protect)
router.post('/check-in', protect, checkIn)
router.post('/check-out', protect, checkOut)
router.get('/history', protect, getMyHistory)

// GET /api/attendance/all-history (เฉพาะ HR)
router.get('/all-history', protect, authorize('HR'), getAllAttendance)

module.exports = router