const prisma = require('../config/prisma')

// ตั้งเวลาเข้างานปกติ (สมมติว่าเป็น 09:00 น.)
const WORK_START_TIME = '09:00:00'

exports.checkIn = async (req, res) => {
  try {
    const userId = req.user.id // ได้มาจาก Auth Middleware

    // 1. เช็คว่าวันนี้ Check-in ไปหรือยัง?
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    
    const existingRecord = await prisma.timeRecord.findFirst({
      where: {
        employeeId: userId,
        workDate: {
          gte: todayStart, // มากกว่าหรือเท่ากับ 00:00 วันนี้
        }
      }
    })

    if (existingRecord) {
      return res.status(400).json({ error: 'วันนี้คุณได้ลงเวลาเข้างานไปแล้ว' })
    }

    // 2. คำนวณว่าสายหรือไม่ (Check Late)
    const now = new Date()
    // สร้างเวลา 09:00 ของวันนี้เพื่อเปรียบเทียบ
    const workStartTime = new Date()
    workStartTime.setHours(9, 0, 0, 0)

    const isLate = now > workStartTime

    // 3. บันทึกข้อมูล
    const record = await prisma.timeRecord.create({
      data: {
        employeeId: userId,
        workDate: now,
        checkInTime: now,
        isLate: isLate
      }
    })

    // --- [เพิ่มใหม่] ถ้ามาสาย ให้แจ้งเตือน HR ทันที ---
    if (isLate) {
        // 1. หา HR ทั้งหมด
        const hrUsers = await prisma.employee.findMany({ where: { role: 'HR' } })
        const lateMessage = `คุณ ${req.user.firstName} ${req.user.lastName} เข้างานสาย (${now.toLocaleTimeString('th-TH')})`

        // 2. สร้าง Notification ใน DB
        const notifications = hrUsers.map(hr => ({
            employeeId: hr.id,
            notificationType: 'LateWarning',
            message: lateMessage,
            isRead: false
        }))

        if (notifications.length > 0) {
            await prisma.notification.createMany({ data: notifications })

            // 3. ส่ง Socket บอก HR Real-time
            const io = req.app.get('io')
            if (io) {
                hrUsers.forEach(hr => {
                    io.to(`user_${hr.id}`).emit('notification', {
                        type: 'LateWarning',
                        message: lateMessage,
                        timestamp: now
                    })
                })
            }
        }
    }
    // -----------------------------------------------------

    res.status(201).json({ 
        message: isLate ? 'ลงเวลาเข้างานสำเร็จ (สาย)' : 'ลงเวลาเข้างานสำเร็จ', 
        data: record 
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลงเวลา' })
  }
}

exports.checkOut = async (req, res) => {
  try {
    const userId = req.user.id
    const now = new Date()

    // 1. หา Record ของวันนี้ล่าสุด
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const record = await prisma.timeRecord.findFirst({
      where: {
        employeeId: userId,
        workDate: { gte: todayStart }
      },
      orderBy: { id: 'desc' }
    })

    if (!record) {
      return res.status(400).json({ error: 'ไม่พบข้อมูลการเข้างานวันนี้ กรุณา Check-in ก่อน' })
    }

    // 2. อัปเดตเวลาออก
    const updatedRecord = await prisma.timeRecord.update({
      where: { id: record.id },
      data: {
        checkOutTime: now
      }
    })

    res.json({ 
        message: 'ลงเวลาออกงานสำเร็จ', 
        data: updatedRecord 
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลงเวลาออก' })
  }
}

// ดูประวัติของตัวเอง
exports.getMyHistory = async (req, res) => {
    try {
        const history = await prisma.timeRecord.findMany({
            where: { employeeId: req.user.id },
            orderBy: { workDate: 'desc' },
            take: 30 // เอาแค่ 30 วันล่าสุด
        })
        res.json(history)
    } catch (error) {
        res.status(500).json({ error: 'ดึงข้อมูลล้มเหลว' })
    }
}