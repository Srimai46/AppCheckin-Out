const jwt = require('jsonwebtoken')

module.exports = (io) => {
  // 1. Middleware ตรวจสอบ Token (คงเดิม - ดีอยู่แล้ว)
  io.use((socket, next) => {
    const token = socket.handshake.auth.token

    if (!token) {
      return next(new Error("Authentication error: Token required"))
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      socket.user = decoded 
      next()
    } catch (err) {
      next(new Error("Authentication error: Invalid token"))
    }
  })

  // 2. เมื่อ User Connect สำเร็จ
  io.on('connection', (socket) => {
    const userId = socket.user.id
    const userRole = socket.user.role // ดึง Role มาจาก Token

    console.log(`⚡ User connected: ${socket.id} (ID: ${userId}, Role: ${userRole})`)

    // ✅ 2.1 เข้าห้องส่วนตัว (Personal Room) สำหรับรับแจ้งเตือนเฉพาะบุคคล
    const personalRoom = `user_${userId}`
    socket.join(personalRoom)

    // ✅ 2.2 เข้าห้องกลุ่ม HR (HR Group Room) 
    // หากเป็น HR ให้เข้ากลุ่ม 'hr_group' เพื่อรับยอด Pending Badge รวม
    if (userRole === 'HR') {
      socket.join('hr_group')
      console.log(`   -> HR User joined: hr_group`)
    }

    // Handle Disconnect
    socket.on('disconnect', () => {
      console.log(`🔥 User disconnected: ${socket.id}`)
    })
  })
}