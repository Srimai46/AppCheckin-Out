require('dotenv').config()
const http = require('http')
const { Server } = require('socket.io')
const app = require('./src/app') 
const prisma = require('./src/config/prisma')
const startCronJobs = require('./src/jobs/attendanceJob') 
const socketHandler = require('./src/sockets/socketHandler') // Import ถูกต้องครับ

const PORT = process.env.PORT || 3000

const server = http.createServer(app)

// ตั้งค่า Socket.io
const io = new Server(server, {
  cors: {
    origin: "*", // ยอมรับทุกที่ (สำคัญสำหรับ LAN)
    methods: ["GET", "POST"]
  }
})

// --- เรียกใช้ Socket Handler ---
socketHandler(io)
// ----------------------------

// เก็บ io instance ไว้ใน app เพื่อเรียกใช้ใน Controller
app.set('io', io)

async function startServer() {
  try {
    await prisma.$connect()
    console.log('✅ Database connected')

    // เริ่มต้น Cron Job
    startCronJobs(io) 

    // 👇 แก้ไขตรงนี้ครับ: เติม '0.0.0.0' เพื่อให้เครื่องอื่นมองเห็น IP เครื่องเรา
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`)
      console.log(`🌐 LAN Access: http://192.168.1.34:${PORT}`) // (IP เครื่องคุณ)
    })
  } catch (error) {
    console.error('❌ Error starting server:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

startServer()