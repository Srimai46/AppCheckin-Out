const prisma = require('../config/prisma')

// ---------------------------------------------------------
// ส่วนของ Worker (พนักงานทั่วไป)
// ---------------------------------------------------------

// 1. ดึงข้อมูลโควต้าวันลาคงเหลือของตัวเอง
exports.getMyQuotas = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear()
    
    // ดึงโควต้าทั้งหมดของปีนี้ + ข้อมูลประเภทการลา
    const quotas = await prisma.leaveQuota.findMany({
      where: {
        employeeId: req.user.id,
        year: currentYear
      },
      include: {
        leaveType: true // join เอาชื่อประเภทการลามาด้วย
      }
    })

    // คำนวณยอดคงเหลือส่งกลับไปให้ Frontend
    const result = quotas.map(q => ({
        type: q.leaveType.typeName,
        total: q.totalDays,
        used: q.usedDays,
        remaining: Number(q.totalDays) - Number(q.usedDays) // คำนวณตรงนี้เลย
    }))

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลโควต้าได้' })
  }
}

// 2. สร้างคำขอลาใหม่ (Submit Leave Request)
exports.createLeaveRequest = async (req, res) => {
  try {
    const { 
        leaveTypeId, 
        startDate, 
        endDate, 
        totalDaysRequested, // รับจำนวนวันมาจาก Frontend (เช่น 0.5, 1, 2.5)
        reason,
        startDuration, // Full, HalfMorning, HalfAfternoon
        endDuration 
    } = req.body

    const userId = req.user.id
    const currentYear = new Date().getFullYear()

    // --- Validation 1: ตรวจสอบโควต้า ---
    // ดึงโควต้าของประเภทลานั้นๆ มาเช็คก่อน
    const quota = await prisma.leaveQuota.findUnique({
        where: {
            employeeId_leaveTypeId_year: { // ใช้ Composite Key ที่เราตั้งไว้
                employeeId: userId,
                leaveTypeId: leaveTypeId,
                year: currentYear
            }
        }
    })

    if (!quota) {
        return res.status(400).json({ error: 'ไม่พบโควต้าวันลาสำหรับปีนี้' })
    }

    // คำนวณวันคงเหลือ
    const remaining = Number(quota.totalDays) - Number(quota.usedDays)
    
    if (remaining < totalDaysRequested) {
        return res.status(400).json({ 
            error: `วันลาคงเหลือไม่พอ (เหลือ ${remaining} วัน, ขอมา ${totalDaysRequested} วัน)` 
        })
    }

    // --- Validation 2: วันที่เริ่มต้องไม่มากกว่าวันจบ ---
    if (new Date(startDate) > new Date(endDate)) {
        return res.status(400).json({ error: 'วันที่เริ่มต้นต้องมาก่อนวันที่สิ้นสุด' })
    }

    // --- บันทึกคำขอ (สถานะเริ่มต้นเป็น Pending) ---
    const newRequest = await prisma.leaveRequest.create({
        data: {
            employeeId: userId,
            leaveTypeId,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            totalDaysRequested,
            reason,
            status: 'Pending',
            startDuration: startDuration || 'Full',
            endDuration: endDuration || 'Full'
        }
    })

    // --- [เพิ่มใหม่] ค้นหา HR ทุกคนเพื่อแจ้งเตือน ---
    const hrUsers = await prisma.employee.findMany({
        where: { role: 'HR' }
    })

    // สร้าง Notification ให้ HR ทุกคน
    const notifications = hrUsers.map(hr => ({
        employeeId: hr.id,
        notificationType: 'NewRequest',
        message: `มีคำขอลาใหม่จากคุณ ${req.user.firstName} ${req.user.lastName}`,
        relatedRequestId: newRequest.id
    }))

    if (notifications.length > 0) {
        await prisma.notification.createMany({
            data: notifications
        })
    }

    res.status(201).json({ message: 'ส่งคำขอลาเรียบร้อยแล้ว รอ HR อนุมัติ', data: newRequest })

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างคำขอลา' })
  }
}

// 3. ดูประวัติการลาของตัวเอง
exports.getMyLeaves = async (req, res) => {
    try {
        const leaves = await prisma.leaveRequest.findMany({
            where: { employeeId: req.user.id },
            orderBy: { requestedAt: 'desc' },
            include: { leaveType: true }
        })
        res.json(leaves)
    } catch (error) {
        res.status(500).json({ error: 'ดึงข้อมูลประวัติผิดพลาด' })
    }
}

// ---------------------------------------------------------
// ส่วนของ HR (ผู้จัดการ)
// ---------------------------------------------------------

// 4. ดูรายการที่รออนุมัติทั้งหมด (HR Only)
exports.getPendingRequests = async (req, res) => {
    try {
        const requests = await prisma.leaveRequest.findMany({
            where: { status: 'Pending' },
            include: {
                employee: { // Join เอาชื่อคนขอมาดูด้วย
                    select: { firstName: true, lastName: true, profileImageUrl: true }
                },
                leaveType: true
            },
            orderBy: { requestedAt: 'asc' } // มาก่อนได้ก่อน
        })
        res.json(requests)
    } catch (error) {
        res.status(500).json({ error: 'ดึงข้อมูลผิดพลาด' })
    }
}

// 5. อนุมัติ/ไม่อนุมัติ (Approve/Reject)
exports.updateLeaveStatus = async (req, res) => {
    // ใช้ Transaction เพื่อความชัวร์ (ถ้า Update Quota พัง สถานะต้องไม่เปลี่ยน)
    try {
        const { requestId, status, rejectReason } = req.body // status = 'Approved' หรือ 'Rejected'
        const hrId = req.user.id

        // หา Request เก่ามาก่อน
        const request = await prisma.leaveRequest.findUnique({
            where: { id: requestId }
        })

        if (!request) return res.status(404).json({ error: 'ไม่พบคำขอนี้' })
        if (request.status !== 'Pending') return res.status(400).json({ error: 'รายการนี้ถูกดำเนินการไปแล้ว' })

        // เริ่ม Transaction
        await prisma.$transaction(async (tx) => {
            
            // 1. อัปเดตสถานะใน LeaveRequest
            await tx.leaveRequest.update({
                where: { id: requestId },
                data: {
                    status: status,
                    approvedByHrId: hrId,
                    approvalDate: new Date(),
                    // ถ้า Rejected อาจจะเก็บเหตุผลไว้ใน field reason หรือสร้าง field ใหม่ก็ได้
                }
            })

            // 2. ถ้า "อนุมัติ" (Approved) ต้องไปตัดโควต้า (LeaveQuota)
            if (status === 'Approved') {
                const currentYear = new Date().getFullYear()
                
                await tx.leaveQuota.update({
                    where: {
                        employeeId_leaveTypeId_year: {
                            employeeId: request.employeeId,
                            leaveTypeId: request.leaveTypeId,
                            year: currentYear
                        }
                    },
                    data: {
                        usedDays: {
                            increment: request.totalDaysRequested // บวกยอดใช้วันลาเพิ่มเข้าไป
                        }
                    }
                })
            }
            
            // --- [เพิ่มใหม่] 3. สร้าง Notification แจ้งเตือนกลับไปหาพนักงาน ---
            let notiMessage = ''
            let notiType = 'Approval'

            if (status === 'Approved') {
                notiMessage = 'คำขอลาของคุณได้รับการอนุมัติแล้ว'
                notiType = 'Approval'
            } else {
                notiMessage = `คำขอลาของคุณถูกปฏิเสธ ${rejectReason ? ': ' + rejectReason : ''}`
                notiType = 'Rejection'
            }

            await tx.notification.create({
                data: {
                    employeeId: request.employeeId, // ส่งกลับหาคนขอ
                    notificationType: notiType,
                    message: notiMessage,
                    relatedRequestId: requestId,
                    isRead: false
                }
            })
        })

        res.json({ message: `ดำเนินการ ${status} เรียบร้อยแล้ว` })

    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตสถานะ' })
    }
}