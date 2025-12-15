const { PrismaClient, Role, LeaveDuration, RequestStatus, NotificationType } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // 1. Clean up old data (ลบข้อมูลเก่าก่อนเพื่อป้องกันการซ้ำซ้อน)
  // เรียงลำดับการลบจากตารางลูกไปหาตารางแม่ (เพื่อเลี่ยง Foreign Key Error)
  await prisma.notification.deleteMany()
  await prisma.leaveRequest.deleteMany()
  await prisma.timeRecord.deleteMany()
  await prisma.leaveQuota.deleteMany()
  await prisma.leaveType.deleteMany()
  await prisma.employee.deleteMany()

  console.log('🧹 Cleaned up old data.')

  // 2. Prepare Password Hash (รหัสผ่านคือ "password123")
  const passwordHash = await bcrypt.hash('password123', 10)

  // 3. Create Employees (สร้างพนักงาน)
  // 3.1 สร้าง HR Manager
  const hrUser = await prisma.employee.create({
    data: {
      firstName: 'Somsri',
      lastName: 'Manager',
      email: 'hr@company.com',
      passwordHash: passwordHash,
      role: Role.HR, // หรือใช้สตริง 'HR' ก็ได้
      joiningDate: new Date('2020-01-01'),
      profileImageUrl: 'https://placehold.co/200x200?text=HR',
    },
  })

  // 3.2 สร้าง Worker 1 (Somchai)
  const worker1 = await prisma.employee.create({
    data: {
      firstName: 'Somchai',
      lastName: 'Worker',
      email: 'somchai@company.com',
      passwordHash: passwordHash,
      role: Role.Worker,
      joiningDate: new Date('2023-05-15'),
      profileImageUrl: 'https://placehold.co/200x200?text=Somchai',
    },
  })

  // 3.3 สร้าง Worker 2 (Suda)
  const worker2 = await prisma.employee.create({
    data: {
      firstName: 'Suda',
      lastName: 'Staff',
      email: 'suda@company.com',
      passwordHash: passwordHash,
      role: Role.Worker,
      joiningDate: new Date('2024-02-01'),
    },
  })

  console.log('👤 Created Employees.')

  // 4. Create Leave Types (สร้างประเภทการลา)
  const sickLeave = await prisma.leaveType.create({
    data: { typeName: 'ลาป่วย (Sick Leave)', isPaid: true },
  })
  
  const annualLeave = await prisma.leaveType.create({
    data: { typeName: 'ลาพักร้อน (Annual Leave)', isPaid: true },
  })

  const personalLeave = await prisma.leaveType.create({
    data: { typeName: 'ลากิจ (Personal Leave)', isPaid: false },
  })

  console.log('📝 Created Leave Types.')

  // 5. Create Leave Quotas (แจกโควต้าวันลา ปีปัจจุบัน)
  const employees = [hrUser, worker1, worker2]
  const currentYear = new Date().getFullYear()

  for (const emp of employees) {
    // แจกโควต้าลาป่วย 30 วันให้ทุกคน
    await prisma.leaveQuota.create({
      data: {
        employeeId: emp.id,
        leaveTypeId: sickLeave.id,
        year: currentYear,
        totalDays: 30.0,
        usedDays: 0.0,
      },
    })

    // แจกโควต้าพักร้อน 10 วัน (ยกเว้น Suda ที่เพิ่งเข้างาน)
    if (emp.id !== worker2.id) {
        await prisma.leaveQuota.create({
            data: {
              employeeId: emp.id,
              leaveTypeId: annualLeave.id,
              year: currentYear,
              totalDays: 10.0,
              usedDays: 0.0,
            },
          })
    }
  }

  console.log('📊 Created Leave Quotas.')

  // 6. Create Time Records (จำลองการลงเวลา)
  // Somchai มาทำงานเมื่อวาน
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  
  await prisma.timeRecord.create({
    data: {
      employeeId: worker1.id,
      workDate: yesterday, 
      checkInTime: new Date(new Date(yesterday).setHours(8, 0, 0)), 
      checkOutTime: new Date(new Date(yesterday).setHours(17, 0, 0)),
      isLate: false,
    },
  })

  // Suda มาทำงานวันนี้ (สาย)
  const today = new Date()
  await prisma.timeRecord.create({
    data: {
      employeeId: worker2.id,
      workDate: today, 
      checkInTime: new Date(new Date(today).setHours(9, 15, 0)), 
      checkOutTime: null, // ยังไม่เลิกงาน
      isLate: true,
    },
  })

  console.log('⏰ Created Time Records.')

  // 7. Create Leave Requests (จำลองการลา)
  
  // Case 1: Somchai ขอลาป่วย (Approved)
  const futureDate1 = new Date()
  futureDate1.setDate(futureDate1.getDate() + 5)

  const req1 = await prisma.leaveRequest.create({
    data: {
      employeeId: worker1.id,
      leaveTypeId: sickLeave.id,
      startDate: futureDate1,
      endDate: futureDate1,
      totalDaysRequested: 1.0,
      startDuration: LeaveDuration.Full,
      endDuration: LeaveDuration.Full,
      reason: 'ปวดท้อง อาหารเป็นพิษ',
      status: RequestStatus.Approved,
      approvedByHrId: hrUser.id,
      approvalDate: new Date(),
    }
  })
  
  // อัปเดต Quota ที่ใช้ไป
  await prisma.leaveQuota.updateMany({
      where: { employeeId: worker1.id, leaveTypeId: sickLeave.id, year: currentYear },
      data: { usedDays: { increment: 1.0 } }
  })

  // Case 2: Suda ขอลากิจ (Pending)
  const futureDate2 = new Date()
  futureDate2.setDate(futureDate2.getDate() + 10)

  const req2 = await prisma.leaveRequest.create({
    data: {
      employeeId: worker2.id,
      leaveTypeId: personalLeave.id,
      startDate: futureDate2,
      endDate: futureDate2,
      totalDaysRequested: 0.5,
      startDuration: LeaveDuration.HalfMorning,
      endDuration: LeaveDuration.HalfMorning,
      reason: 'ไปติดต่อราชการ',
      status: RequestStatus.Pending,
    }
  })

  // Case 3: Somchai ขอลาพักร้อน (Rejected)
  const futureDate3Start = new Date()
  futureDate3Start.setDate(futureDate3Start.getDate() + 20)
  const futureDate3End = new Date()
  futureDate3End.setDate(futureDate3End.getDate() + 22)

  const req3 = await prisma.leaveRequest.create({
    data: {
        employeeId: worker1.id,
        leaveTypeId: annualLeave.id,
        startDate: futureDate3Start,
        endDate: futureDate3End,
        totalDaysRequested: 3.0,
        startDuration: LeaveDuration.Full,
        endDuration: LeaveDuration.Full,
        reason: 'ไปเที่ยวญี่ปุ่น',
        status: RequestStatus.Rejected,
        approvedByHrId: hrUser.id,
        approvalDate: new Date(),
      }
  })

  console.log('✈️ Created Leave Requests.')

  // 8. Create Notifications (การแจ้งเตือน)
  
  // แจ้งเตือน Somchai
  await prisma.notification.create({
      data: {
          employeeId: worker1.id,
          notificationType: NotificationType.Approval,
          message: 'คำขอลาป่วยของคุณได้รับการอนุมัติแล้ว',
          relatedRequestId: req1.id,
          isRead: false
      }
  })

  // แจ้งเตือน HR
  await prisma.notification.create({
      data: {
          employeeId: hrUser.id,
          notificationType: NotificationType.NewRequest,
          message: 'คุณ Suda ได้ส่งคำขอลากิจใหม่',
          relatedRequestId: req2.id,
          isRead: false
      }
  })

  // แจ้งเตือน Somchai (Rejected)
  await prisma.notification.create({
    data: {
        employeeId: worker1.id,
        notificationType: NotificationType.Rejection,
        message: 'คำขอลาพักร้อนของคุณถูกปฏิเสธเนื่องจากงานเร่งด่วน',
        relatedRequestId: req3.id,
        isRead: true
    }
  })

  console.log('🔔 Created Notifications.')
  console.log('✅ Seeding completed successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })