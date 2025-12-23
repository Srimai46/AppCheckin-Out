const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding...');

  // 1. ล้างข้อมูลเก่า (ลำดับการลบสำคัญมากเพื่อไม่ให้ติด Foreign Key)
  await prisma.notification.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.timeRecord.deleteMany();
  await prisma.specialLeaveGrant.deleteMany();
  await prisma.leaveQuota.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.employee.deleteMany();
  console.log('🧹 Cleaned old data.');

  // 2. สร้าง Leave Types พร้อมนโยบาย (Carry Over & Consecutive Limit)
  const leaveTypesData = [
    { typeName: 'Sick', isPaid: true, maxCarryOver: 0, maxConsecutiveDays: 30 },
    { typeName: 'Personal', isPaid: true, maxCarryOver: 0, maxConsecutiveDays: 3 },
    { typeName: 'Annual', isPaid: true, maxCarryOver: 5.0, maxConsecutiveDays: 10 },
    { typeName: 'Emergency', isPaid: true, maxCarryOver: 0, maxConsecutiveDays: 2 },
    { typeName: 'Marriage', isPaid: true, maxCarryOver: 0, maxConsecutiveDays: 5 },
  ];

  const leaveTypes = {};
  for (const type of leaveTypesData) {
    const created = await prisma.leaveType.create({ data: type });
    leaveTypes[type.typeName] = created;
  }
  console.log('📝 Created Leave Types.');

  // 3. สร้าง Employees
  const passwordHash = await bcrypt.hash('123456', 10);
  
  const hrUser = await prisma.employee.create({
    data: {
      firstName: 'Somsri',
      lastName: 'Manager (HR)',
      email: 'hr@company.com',
      passwordHash,
      role: 'HR',
      joiningDate: new Date('2020-01-01'),
    },
  });

  const worker1 = await prisma.employee.create({
    data: {
      firstName: 'Somchai',
      lastName: 'OldWorker',
      email: 'somchai@company.com',
      passwordHash,
      role: 'Worker',
      joiningDate: new Date('2023-05-15'), // พนักงานเก่า
    },
  });

  const worker2 = await prisma.employee.create({
    data: {
      firstName: 'Suda',
      lastName: 'NewStaff',
      email: 'suda@company.com',
      passwordHash,
      role: 'Worker',
      joiningDate: new Date('2025-02-01'), // พนักงานใหม่ปีนี้
    },
  });
  console.log('👤 Created Employees.');

  // 4. แจก Quotas (จัดการข้อมูลปี 2025 และ เตรียมปี 2026)
  const currentYear = 2025;
  const nextYear = 2026;
  const employees = [hrUser, worker1, worker2];

  for (const emp of employees) {
    for (const typeName in leaveTypes) {
      // Logic สำหรับปีปัจจุบัน 2025
      let totalDays = (typeName === 'Sick') ? 30 : (typeName === 'Personal' ? 6 : 10);
      let carryOver = (typeName === 'Annual' && emp.id === worker1.id) ? 4.5 : 0; // Somchai มีวันทบ

      await prisma.leaveQuota.create({
        data: {
          employeeId: emp.id,
          leaveTypeId: leaveTypes[typeName].id,
          year: currentYear,
          totalDays,
          carryOverDays: carryOver,
          usedDays: 0,
        },
      });

      // ✅ เตรียมโควตาล่วงหน้าปี 2026 (ตามที่คุณต้องการ)
      await prisma.leaveQuota.create({
        data: {
          employeeId: emp.id,
          leaveTypeId: leaveTypes[typeName].id,
          year: nextYear,
          totalDays: totalDays + 2, // สมมติว่าปีหน้าได้วันลาเพิ่มคนละ 2 วัน
          carryOverDays: 0, // จะถูกคำนวณตอนสิ้นปี 2025
          usedDays: 0,
        },
      });
    }
  }
  console.log('📊 Created Leave Quotas for 2025 & 2026.');

  // 5. สร้าง Special Leave Grants (สิทธิ์พิเศษที่มีวันหมดอายุ)
  await prisma.specialLeaveGrant.create({
    data: {
      employeeId: worker1.id,
      leaveTypeId: leaveTypes['Marriage'].id,
      amount: 5.0,
      reason: 'สวัสดิการสมรสสำหรับพนักงานเก่า',
      expiryDate: new Date('2025-12-31'),
    },
  });

  // 6. สร้าง Time Records (ทดสอบระบบลงเวลาและ Note)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  await prisma.timeRecord.create({
    data: {
      employeeId: worker1.id,
      workDate: yesterday,
      checkInTime: new Date(new Date(yesterday).setHours(8, 0, 0)),
      checkOutTime: new Date(new Date(yesterday).setHours(17, 30, 0)),
      isLate: false,
      note: 'ทำงานล่วงเวลาเคลียร์ Report สิ้นเดือน',
    },
  });

  await prisma.timeRecord.create({
    data: {
      employeeId: worker2.id,
      workDate: new Date(),
      checkInTime: new Date(new Date().setHours(9, 45, 0)), // สาย
      isLate: true,
      note: 'รถไฟฟ้าขัดข้อง (BTS สายสุขุมวิท)',
    },
  });

  // 7. สร้าง Leave Requests และประวัติการอนุมัติ
  // เคสที่อนุมัติแล้ว และมีการหักโควตา
  const req1 = await prisma.leaveRequest.create({
    data: {
      employeeId: worker1.id,
      leaveTypeId: leaveTypes['Annual'].id,
      startDate: new Date('2025-03-01'),
      endDate: new Date('2025-03-02'),
      totalDaysRequested: 2.0,
      startDuration: 'Full',
      endDuration: 'Full',
      reason: 'ไปเที่ยวพักผ่อนกับครอบครัว',
      status: 'Approved',
      approvedByHrId: hrUser.id,
      approvalDate: new Date(),
    },
  });

  await prisma.leaveQuota.updateMany({
    where: { employeeId: worker1.id, leaveTypeId: leaveTypes['Annual'].id, year: 2025 },
    data: { usedDays: { increment: 2.0 } },
  });

  // เคสที่รออนุมัติ (Pending)
  const req2 = await prisma.leaveRequest.create({
    data: {
      employeeId: worker2.id,
      leaveTypeId: leaveTypes['Personal'].id,
      startDate: new Date('2025-06-15'),
      endDate: new Date('2025-06-15'),
      totalDaysRequested: 1.0,
      startDuration: 'Full',
      endDuration: 'Full',
      reason: 'ไปติดต่อทำพาสปอร์ต',
      status: 'Pending',
    },
  });

  // 8. สร้าง Notifications ทดสอบระบบกระดิ่ง
  await prisma.notification.createMany({
    data: [
      {
        employeeId: worker1.id,
        notificationType: 'Approval',
        message: 'คำขอลาพักร้อนของคุณได้รับการอนุมัติแล้ว',
        relatedRequestId: req1.id,
        isRead: false
      },
      {
        employeeId: hrUser.id,
        notificationType: 'NewRequest',
        message: `คำขอลาใหม่จากคุณ Suda (ลากิจ 1 วัน)`,
        relatedRequestId: req2.id,
        isRead: false
      }
    ],
  });

  console.log('✅ Seeding completed! Data is ready for LAN testing.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });