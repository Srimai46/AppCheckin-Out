const prisma = require('../config/prisma')

// ---------------------------------------------------------
// ส่วนของ Worker (พนักงานทั่วไป)
// ---------------------------------------------------------

exports.getMyQuotas = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear()
    const quotas = await prisma.leaveQuota.findMany({
      where: { employeeId: req.user.id, year: currentYear },
      include: { leaveType: true }
    })

    const result = quotas.map(q => ({
        type: q.leaveType.typeName,
        total: q.totalDays,
        used: q.usedDays,
        remaining: Number(q.totalDays) - Number(q.usedDays)
    }))

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลโควต้าได้' })
  }
}

exports.createLeaveRequest = async (req, res) => {
  try {
    const { 
        leaveTypeId, startDate, endDate, totalDaysRequested, 
        reason, startDuration, endDuration 
    } = req.body

    const userId = req.user.id
    const currentYear = new Date().getFullYear()

    // --- Validation ---
    const quota = await prisma.leaveQuota.findUnique({
        where: {
            employeeId_leaveTypeId_year: {
                employeeId: userId,
                leaveTypeId: leaveTypeId,
                year: currentYear
            }
        }
    })

    if (!quota) return res.status(400).json({ error: 'ไม่พบโควต้าวันลาสำหรับปีนี้' })

    const remaining = Number(quota.totalDays) - Number(quota.usedDays)
    if (remaining < totalDaysRequested) {
        return res.status(400).json({ 
            error: `วันลาคงเหลือไม่พอ (เหลือ ${remaining} วัน, ขอมา ${totalDaysRequested} วัน)` 
        })
    }

    if (new Date(startDate) > new Date(endDate)) {
        return res.status(400).json({ error: 'วันที่เริ่มต้นต้องมาก่อนวันที่สิ้นสุด' })
    }

    // --- Create Request ---
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

    // --- Notification & Socket.io ---
    const hrUsers = await prisma.employee.findMany({ where: { role: 'HR' } })

    // 1. Save to DB
    const notifications = hrUsers.map(hr => ({
        employeeId: hr.id,
        notificationType: 'NewRequest',
        message: `มีคำขอลาใหม่จากคุณ ${req.user.firstName} ${req.user.lastName}`,
        relatedRequestId: newRequest.id
    }))

    if (notifications.length > 0) {
        await prisma.notification.createMany({ data: notifications })
        
        // 2. [เพิ่มใหม่] Real-time Emit หา HR ทุกคน
        const io = req.app.get('io')
        hrUsers.forEach(hr => {
            io.to(`user_${hr.id}`).emit('notification', {
                type: 'NewRequest',
                message: `มีคำขอลาใหม่จากคุณ ${req.user.firstName} ${req.user.lastName}`,
                data: newRequest
            })
        })
    }

    res.status(201).json({ message: 'ส่งคำขอลาเรียบร้อยแล้ว รอ HR อนุมัติ', data: newRequest })

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างคำขอลา' })
  }
}

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

exports.getPendingRequests = async (req, res) => {
    try {
        const requests = await prisma.leaveRequest.findMany({
            where: { status: 'Pending' },
            include: {
                employee: { select: { firstName: true, lastName: true, profileImageUrl: true } },
                leaveType: true
            },
            orderBy: { requestedAt: 'asc' }
        })
        res.json(requests)
    } catch (error) {
        res.status(500).json({ error: 'ดึงข้อมูลผิดพลาด' })
    }
}

exports.updateLeaveStatus = async (req, res) => {
    try {
        const { requestId, status, rejectReason } = req.body 
        const hrId = req.user.id

        const request = await prisma.leaveRequest.findUnique({ where: { id: requestId } })

        if (!request) return res.status(404).json({ error: 'ไม่พบคำขอนี้' })
        if (request.status !== 'Pending') return res.status(400).json({ error: 'รายการนี้ถูกดำเนินการไปแล้ว' })

        await prisma.$transaction(async (tx) => {
            // 1. Update Status
            await tx.leaveRequest.update({
                where: { id: requestId },
                data: {
                    status: status,
                    approvedByHrId: hrId,
                    approvalDate: new Date(),
                }
            })

            // 2. Cut Quota (if Approved)
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
                    data: { usedDays: { increment: request.totalDaysRequested } }
                })
            }
            
            // 3. Notification Logic
            let notiMessage = ''
            let notiType = 'Approval'

            if (status === 'Approved') {
                notiMessage = 'คำขอลาของคุณได้รับการอนุมัติแล้ว'
                notiType = 'Approval'
            } else {
                notiMessage = `คำขอลาของคุณถูกปฏิเสธ ${rejectReason ? ': ' + rejectReason : ''}`
                notiType = 'Rejection'
            }

            // Save to DB
            await tx.notification.create({
                data: {
                    employeeId: request.employeeId,
                    notificationType: notiType,
                    message: notiMessage,
                    relatedRequestId: requestId,
                    isRead: false
                }
            })

            // 4. [เพิ่มใหม่] Real-time Emit หาพนักงาน
            // (ต้องเรียก io นอก scope tx แต่ในนี้ req.app เรียกใช้ได้เลย)
            const io = req.app.get('io')
            io.to(`user_${request.employeeId}`).emit('notification', {
                type: notiType,
                message: notiMessage,
                requestId: requestId
            })
        })

        res.json({ message: `ดำเนินการ ${status} เรียบร้อยแล้ว` })

    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตสถานะ' })
    }
}