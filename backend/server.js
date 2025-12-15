require('dotenv').config()
const http = require('http')
const { Server } = require('socket.io')
const app = require('./src/app') 
const prisma = require('./src/config/prisma')
const startCronJobs = require('./src/jobs/attendanceJob') // เช็คชื่อไฟล์ดีๆ นะครับ (Job ไม่มี s)
const socketHandler = require('./src/sockets/socketHandler') // <--- [เพิ่ม] Import ไฟล์ที่เพิ่งสร้าง

const PORT = process.env.PORT || 3000

const server = http.createServer(app)

// ตั้งค่า Socket.io
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
})

// --- [เรียกใช้] Socket Handler ที่แยกออกไป ---
socketHandler(io)
// ----------------------------------------

// เก็บ io instance ไว้ใน app เพื่อเรียกใช้ใน Controller
app.set('io', io)

async function startServer() {
  try {
    await prisma.$connect()
    console.log('✅ Database connected')

    // เริ่มต้น Cron Job
    startCronJobs(io) 

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