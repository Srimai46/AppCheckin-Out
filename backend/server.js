require('dotenv').config()
const http = require('http')
const { Server } = require('socket.io')
const jwt = require('jsonwebtoken') // <--- [เพิ่ม] ต้องใช้แกะ Token
const app = require('./src/app') 
const prisma = require('./src/config/prisma')
const startCronJobs = require('./src/jobs/attendanceJob')

const PORT = process.env.PORT || 3000

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
})

// --- [เพิ่ม] Middleware ตรวจสอบ Token ก่อนยอมให้ Connect ---
io.use((socket, next) => {
  // รับ Token ที่ Client ส่งมาทาง auth: { token: "..." }
  const token = socket.handshake.auth.token

  if (!token) {
    return next(new Error("Authentication error: Token required"))
  }

  try {
    // ตรวจสอบความถูกต้องของ Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    socket.user = decoded // เก็บข้อมูล user (id, role) ไว้ใน socket
    next()
  } catch (err) {
    next(new Error("Authentication error: Invalid token"))
  }
})

// --- [แก้ไข] เมื่อ User Connect สำเร็จ ---
io.on('connection', (socket) => {
  console.log(`⚡ User connected: ${socket.id} (User ID: ${socket.user.id})`)

  // 1. จับ User เข้าห้องส่วนตัวทันที (ชื่อห้อง: "user_1", "user_2")
  // เพื่อให้ Backend ส่งข้อความหาคนๆ นั้นได้เจาะจง
  const personalRoom = `user_${socket.user.id}`
  socket.join(personalRoom)
  console.log(`   -> Joined room: ${personalRoom}`)

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`)
  })
})

// เก็บ io instance ไว้ใน app เพื่อเรียกใช้ใน Controller
app.set('io', io)

async function startServer() {
  try {
    await prisma.$connect()
    console.log('✅ Database connected')

    // --- [เพิ่มบรรทัดนี้] เริ่มต้น Cron Job ---
    startCronJobs(io) 
    // ------------------------------------

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`)
    })
  } catch (error) {
    console.error('❌ Error starting server:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

startServer()