const cron = require('node-cron')
const prisma = require('../config/prisma')

// ฟังก์ชันที่จะรันตามเวลา
const checkAbsentEmployees = async (io) => {
    console.log('⏰ Running Cron Job: Checking absent employees...')
    
    try {
        // 1. กำหนดเวลาเส้นตาย (เช่น วันนี้ตอน 10:00 น.)
        const today = new Date()
        today.setHours(0, 0, 0, 0) // เที่ยงคืนของวันนี้

        // 2. หาพนักงานทั้งหมดที่ Active และไม่ใช่ HR
        const employees = await prisma.employee.findMany({
            where: { 
                isActive: true,
                role: 'Worker' 
            }
        })

        // 3. วนลูปเช็คทีละคน
        for (const emp of employees) {
            // ดูว่าวันนี้มีการลงเวลาหรือยัง?
            const record = await prisma.timeRecord.findFirst({
                where: {
                    employeeId: emp.id,
                    workDate: { gte: today }
                }
            })

            // ถ้ายังไม่มี Record = ยังไม่มาทำงาน
            if (!record) {
                // สร้าง Notification เตือนใน DB
                const message = `คุณยังไม่ได้ลงเวลาเข้างานประจำวันที่ ${today.toLocaleDateString()} กรุณาตรวจสอบ`
                
                await prisma.notification.create({
                    data: {
                        employeeId: emp.id,
                        notificationType: 'LateWarning',
                        message: message,
                        isRead: false
                    }
                })

                // ส่ง Socket บอกพนักงานคนนั้น (ถ้าเขาเปิดเว็บอยู่)
                if (io) {
                    io.to(`user_${emp.id}`).emit('notification', {
                        type: 'LateWarning',
                        message: message
                    })
                }
                
                console.log(`⚠️ Sent warning to ${emp.firstName}`)
            }
        }

    } catch (error) {
        console.error('❌ Cron Job Error:', error)
    }
}

// ตั้งเวลา: รันทุกวันจันทร์-ศุกร์ ตอน 10:00 น.
const startCronJobs = (io) => {
    // Syntax: "นาที ชั่วโมง วัน เดือน วันในสัปดาห์"
    // '0 10 * * 1-5' แปลว่า 10:00 น. จันทร์-ศุกร์
    // *เพื่อการทดสอบ: ให้แก้เป็น '* * * * *' (รันทุกนาที) จะได้เห็นผลเลย*
    
    cron.schedule('0 10 * * 1-5', () => {
        checkAbsentEmployees(io)
    })
    
    console.log('✅ Cron Jobs started')
}

module.exports = startCronJobs