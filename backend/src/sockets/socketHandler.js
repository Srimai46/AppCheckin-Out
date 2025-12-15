const jwt = require('jsonwebtoken')

module.exports = (io) => {
  // 1. Middleware ตรวจสอบ Token ก่อนยอมให้ Connect
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

  // 2. เมื่อ User Connect สำเร็จ
  io.on('connection', (socket) => {
    console.log(`⚡ User connected: ${socket.id} (User ID: ${socket.user.id})`)

    // จับ User เข้าห้องส่วนตัวทันที (ชื่อห้อง: "user_1", "user_2")
    const personalRoom = `user_${socket.user.id}`
    socket.join(personalRoom)
    console.log(`   -> Joined room: ${personalRoom}`)

    // Handle Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`)
    })
  })
}