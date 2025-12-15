require('dotenv').config()
const http = require('http')
const { Server } = require('socket.io')
const app = require('./src/app') // เรียก app จาก folder src
const prisma = require('./src/config/prisma')

const PORT = process.env.PORT || 3000

// สร้าง HTTP Server (จำเป็นสำหรับ Socket.io)
const server = http.createServer(app)

// ตั้งค่า Socket.io
const io = new Server(server, {
  cors: {
    origin: "*", // หรือใส่ URL ของ Frontend เช่น "http://localhost:5173"
    methods: ["GET", "POST"]
  }
})

// เก็บ io instance ไว้ใน app เพื่อเรียกใช้ใน Controller ได้ (req.app.get('io'))
app.set('io', io)

// Socket Event Handlers
io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  // ตัวอย่าง: Join room ตาม employee_id เพื่อแจ้งเตือนส่วนตัว
  socket.on('join_room', (employeeId) => {
    socket.join(`emp_${employeeId}`)
    console.log(`User ${socket.id} joined room emp_${employeeId}`)
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
  })
})

// Start Server
async function startServer() {
  try {
    // Test DB Connection
    await prisma.$connect()
    console.log('✅ Database connected')

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