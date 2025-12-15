const express = require('express')
const cors = require('cors')
const morgan = require('morgan')

// Import Routes (เดี๋ยวเราจะมาสร้างไฟล์เหล่านี้ทีหลัง)
const authRoutes = require('./routes/authRoutes')
const timeRecordRoutes = require('./routes/timeRecordRoutes')
const leaveRoutes = require('./routes/leaveRoutes')
const notificationRoutes = require('./routes/notificationRoutes') // <--- เพิ่ม
const app = express()

// Middlewares
app.use(cors({
  // เปลี่ยนเป็น "*" เพื่อยอมรับทุกเครื่องในวง LAN
  origin: "*", 
  credentials: true
}))
app.use(morgan('dev')) // Log การเรียก API ดูง่ายๆ
app.use(express.json()) // อ่าน JSON Body
app.use(express.urlencoded({ extended: true }))

// Routes Setup (Uncomment เมื่อสร้างไฟล์ Route แล้ว)
app.use('/api/auth', authRoutes)
app.use('/api/attendance', timeRecordRoutes)
app.use('/api/leaves', leaveRoutes)
app.use('/api/notifications', notificationRoutes) // <--- เพิ่มบรรทัดนี้

// Health Check
app.get('/', (req, res) => {
  res.send('API is running...')
})

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ 
    error: 'Something went wrong!', 
    message: err.message 
  })
})

module.exports = app