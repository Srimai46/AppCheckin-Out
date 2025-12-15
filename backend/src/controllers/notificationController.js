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

    await prisma.notification.update({
      where: { id: Number(id) },
      data: { isRead: true }
    })

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