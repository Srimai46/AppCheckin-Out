const prisma = require('../config/prisma')

// 1. ดูการแจ้งเตือนทั้งหมดของฉัน
exports.getMyNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { employeeId: req.user.id },
      orderBy: { createdAt: 'desc' }, // ใหม่สุดขึ้นก่อน
      take: 20 // เอาแค่ 20 รายการล่าสุด
    })
    
    // นับจำนวนที่ยังไม่ได้อ่านส่งไปด้วย (Unread Count)
    const unreadCount = await prisma.notification.count({
        where: { 
            employeeId: req.user.id,
            isRead: false
        }
    })

    res.json({ notifications, unreadCount })
  } catch (error) {
    res.status(500).json({ error: 'ดึงข้อมูลการแจ้งเตือนล้มเหลว' })
  }
}

// 2. กดอ่านการแจ้งเตือน (Mark as Read)
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params // รับ notification_id

    // ใช้ updateMany แทน update เพื่อให้ใส่เงื่อนไข employeeId ได้
    // (เป็นการป้องกันไม่ให้ไปกดอ่านแจ้งเตือนของคนอื่น)
    const result = await prisma.notification.updateMany({
      where: { 
        id: Number(id),
        employeeId: req.user.id // <--- ต้องเป็นของฉันเท่านั้น
      },
      data: { isRead: true }
    })

    if (result.count === 0) {
        return res.status(404).json({ error: 'ไม่พบการแจ้งเตือน หรือคุณไม่มีสิทธิ์' })
    }

    res.json({ message: 'อ่านแล้ว' })
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' })
  }
}

// 3. กดอ่านทั้งหมด (Mark All as Read)
exports.markAllAsRead = async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: { 
                employeeId: req.user.id,
                isRead: false 
            },
            data: { isRead: true }
        })
        res.json({ message: 'อ่านทั้งหมดแล้ว' })
    } catch (error) {
        res.status(500).json({ error: 'เกิดข้อผิดพลาด' })
    }
}