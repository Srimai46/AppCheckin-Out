const express = require('express')
const router = express.Router()
const { checkIn, checkOut, getMyHistory } = require('../controllers/timeRecordController')
const { protect } = require('../middlewares/authMiddleware')

// ทุก Route ในนี้ต้อง Login ก่อน (ผ่าน protect)
router.post('/check-in', protect, checkIn)
router.post('/check-out', protect, checkOut)
router.get('/history', protect, getMyHistory)

module.exports = router