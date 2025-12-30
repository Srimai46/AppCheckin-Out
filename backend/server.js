// backend/server.js
require('dotenv').config()
const http = require('http')
const { Server } = require('socket.io')
const app = require('./src/app') 
const prisma = require('./src/config/prisma')
const startCronJobs = require('./src/jobs/attendanceJob') 
const socketHandler = require('./src/sockets/socketHandler')
const os = require('os'); // ✅ เพิ่ม os module เพื่อดึง IP เครื่องอัตโนมัติ

const PORT = process.env.PORT || 8080 // ปกติ API มักใช้ 8080

const server = http.createServer(app)

// ตั้งค่า Socket.io
const io = new Server(server, {
  cors: {
    origin: "*", // ✅ สำคัญมาก: ยอมรับทุกที่เพื่อให้คนใน LAN เชื่อมต่อ Socket ได้
    methods: ["GET", "POST"]
  }
})

socketHandler(io)
app.set('io', io)

async function startServer() {
  try {
    await prisma.$connect()
    console.log('✅ Database connected')

    startCronJobs(io) 

    // ✅ ฟังที่ 0.0.0.0 เพื่อเปิดรับการเชื่อมต่อจาก LAN
    server.listen(PORT, '0.0.0.0', () => {
      // 💡 โค้ดส่วนนี้จะช่วยหาเลข IP ในเครื่องคุณมาโชว์ที่ Log โดยอัตโนมัติ
      const interfaces = os.networkInterfaces();
      let ipAddress = 'localhost';
      for (const devName in interfaces) {
        interfaces[devName].forEach((iface) => {
          if (iface.family === 'IPv4' && !iface.internal) {
            ipAddress = iface.address;
          }
        });
      }

      console.log(`🚀 Server is running!`);
      console.log(`🏠 Local: http://localhost:${PORT}`);
      console.log(`🌐 LAN:   http://${ipAddress}:${PORT}`); // ✅ โชว์ IP จริงให้เพื่อนเห็น
    })
  } catch (error) {
    console.error('❌ Error starting server:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

startServer()