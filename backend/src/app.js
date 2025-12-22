const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const path = require('path') 

// Import Routes
const authRoutes = require('./routes/authRoutes')
const timeRecordRoutes = require('./routes/timeRecordRoutes')
const leaveRoutes = require('./routes/leaveRoutes')
const notificationRoutes = require('./routes/notificationRoutes')
const employeeRoutes = require('./routes/employeeRoute')

const app = express()

// Middlewares
app.use(cors({
  origin: "*", 
  credentials: true
}))
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Routes Setup
app.use('/api/auth', authRoutes)
app.use('/api/attendance', timeRecordRoutes)
app.use('/api/leaves', leaveRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/employees', employeeRoutes)

// Health Check
app.get('/', (req, res) => {
  res.send('API is running...')
})

app.use((err, req, res, next) => {
  console.error(err.stack)

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'ไฟล์มีขนาดใหญ่เกินไป (จำกัด 5MB)' })
  }

  res.status(500).json({ 
    error: 'Something went wrong!', 
    message: err.message 
  })
})

module.exports = app