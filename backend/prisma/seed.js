const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding...');

  // 1. ล้างข้อมูลเก่า (ลบจากตารางที่มี Foreign Key ก่อน)
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
      lastName: 'Manager',
      email: 'hr@company.com',
      passwordHash,
      role: 'HR',
      joiningDate: new Date('2020-01-01'),
    },
  });

  const worker1 = await prisma.employee.create({
    data: {
      firstName: 'Somchai',
      lastName: 'Worker',
      email: 'somchai@company.com',
      passwordHash,
      role: 'Worker',
      joiningDate: new Date('2023-05-15'),
    },
  });

  const worker2 = await prisma.employee.create({
    data: {
      firstName: 'Suda',
      lastName: 'Staff',
      email: 'suda@company.com',
      passwordHash,
      role: 'Worker',
      joiningDate: new Date('2024-02-01'),
    },
  });
  console.log('👤 Created Employees.');

  // 4. แจก Quotas (รวม carryOverDays)
  const currentYear = new Date().getFullYear();
  const employees = [hrUser, worker1, worker2];

  for (const emp of employees) {
    for (const typeName in leaveTypes) {
      let totalDays = 0;
      let carryOver = 0;

      if (typeName === 'Sick') totalDays = 30;
      else if (typeName === 'Personal') totalDays = 6;
      else if (typeName === 'Emergency') totalDays = 5;
      else if (typeName === 'Annual') {
        totalDays = 10;
        if (emp.id === worker1.id) carryOver = 4.5; // Somchai มีวันทบมา
      }

      if (totalDays > 0 || carryOver > 0) {
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
      }
    }
  }
  console.log('📊 Created Leave Quotas.');

  // 5. สร้าง Special Leave Grants (ตัวอย่างการมอบสิทธิ์พิเศษ)
  await prisma.specialLeaveGrant.create({
    data: {
      employeeId: worker1.id,
      leaveTypeId: leaveTypes['Marriage'].id,
      amount: 5.0,
      reason: 'สวัสดิการสมรสพนักงานใหม่',
      expiryDate: new Date(`${currentYear}-12-31`),
    },
  });
  console.log('🎁 Created Special Leave Grants.');

  // 6. สร้าง Time Records (พร้อมฟิลด์ Note)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  await prisma.timeRecord.create({
    data: {
      employeeId: worker1.id,
      workDate: yesterday,
      checkInTime: new Date(new Date(yesterday).setHours(8, 0, 0)),
      checkOutTime: new Date(new Date(yesterday).setHours(17, 30, 0)),
      isLate: false,
      note: 'ทำงานล่วงเวลาเล็กน้อยเพื่อเคลียร์งาน',
    },
  });

  const today = new Date();
  await prisma.timeRecord.create({
    data: {
      employeeId: worker2.id,
      workDate: today,
      checkInTime: new Date(new Date(today).setHours(9, 45, 0)),
      checkOutTime: null,
      isLate: true,
      note: 'รถไฟฟ้าขัดข้อง',
    },
  });
  console.log('⏰ Created Time Records.');

  // 7. สร้าง Leave Requests และหักโควตา
  // Somchai ลาป่วย
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 2);
  const req1 = await prisma.leaveRequest.create({
    data: {
      employeeId: worker1.id,
      leaveTypeId: leaveTypes['Sick'].id,
      startDate: futureDate,
      endDate: futureDate,
      totalDaysRequested: 1.0,
      startDuration: 'Full',
      endDuration: 'Full',
      reason: 'อาหารเป็นพิษ',
      status: 'Approved',
      approvedByHrId: hrUser.id,
      approvalDate: new Date(),
    },
  });
  
  await prisma.leaveQuota.updateMany({
    where: { employeeId: worker1.id, leaveTypeId: leaveTypes['Sick'].id, year: currentYear },
    data: { usedDays: { increment: 1.0 } },
  });

  // Suda ขอลากิจ (Pending)
  const req2 = await prisma.leaveRequest.create({
    data: {
      employeeId: worker2.id,
      leaveTypeId: leaveTypes['Personal'].id,
      startDate: new Date(new Date().setDate(today.getDate() + 10)),
      endDate: new Date(new Date().setDate(today.getDate() + 10)),
      totalDaysRequested: 0.5,
      startDuration: 'HalfAfternoon',
      endDuration: 'HalfAfternoon',
      reason: 'ไปรับบุตรที่โรงเรียน',
      status: 'Pending',
    },
  });
  console.log('✈️ Created Leave Requests.');

  // 8. สร้าง Notifications
  await prisma.notification.createMany({
    data: [
      {
        employeeId: worker1.id,
        notificationType: 'Approval',
        message: 'ใบลาป่วยของคุณได้รับการอนุมัติแล้ว',
        relatedRequestId: req1.id,
      },
      {
        employeeId: hrUser.id,
        notificationType: 'NewRequest',
        message: 'มีคำขอลาใหม่จากคุณ Suda (ลากิจ)',
        relatedRequestId: req2.id,
      },
    ],
  });
  console.log('🔔 Created Notifications.');

  console.log('✅ Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });