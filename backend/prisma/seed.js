const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding...');

  // 1. ล้างข้อมูลเก่า
  await prisma.notification.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.timeRecord.deleteMany();
  await prisma.leaveQuota.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.employee.deleteMany();
  console.log('🧹 Cleaned old data.');

  // 2. สร้าง Leave Types
  const leaveTypesData = [
    { typeName: 'Sick', isPaid: true },
    { typeName: 'Personal', isPaid: true },
    { typeName: 'Annual', isPaid: true },
    { typeName: 'Emergency', isPaid: true },
    { typeName: 'Other', isPaid: false },
  ];
  const leaveTypes = [];
  for (const type of leaveTypesData) {
    const created = await prisma.leaveType.create({ data: type });
    leaveTypes.push(created);
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

  // 4. แจก Quotas
  const currentYear = new Date().getFullYear();
  const employees = [hrUser, worker1, worker2];
  for (const emp of employees) {
    for (const type of leaveTypes) {
      let defaultDays = 0;
      if (type.typeName === 'Sick') defaultDays = 30;
      else if (type.typeName === 'Personal') defaultDays = 6;
      else if (type.typeName === 'Annual') defaultDays = emp.id === worker2.id ? 0 : 10;
      else if (type.typeName === 'Emergency') defaultDays = 5;

      if (defaultDays > 0) {
        await prisma.leaveQuota.create({
          data: {
            employeeId: emp.id,
            leaveTypeId: type.id,
            year: currentYear,
            totalDays: defaultDays,
            usedDays: 0,
          },
        });
      }
    }
  }
  console.log('📊 Created Leave Quotas.');

  // 5. สร้าง Time Records
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  await prisma.timeRecord.create({
    data: {
      employeeId: worker1.id,
      workDate: yesterday,
      checkInTime: new Date(yesterday.setHours(8, 0, 0)),
      checkOutTime: new Date(yesterday.setHours(17, 0, 0)),
      isLate: false,
    },
  });
  const today = new Date();
  await prisma.timeRecord.create({
    data: {
      employeeId: worker2.id,
      workDate: today,
      checkInTime: new Date(today.setHours(9, 15, 0)),
      checkOutTime: null,
      isLate: true,
    },
  });
  console.log('⏰ Created Time Records.');

  // 6. สร้าง Leave Requests
  const sickLeave = leaveTypes.find(t => t.typeName === 'Sick');
  const annualLeave = leaveTypes.find(t => t.typeName === 'Annual');
  const personalLeave = leaveTypes.find(t => t.typeName === 'Personal');

  const futureDate1 = new Date();
  futureDate1.setDate(futureDate1.getDate() + 5);
  const req1 = await prisma.leaveRequest.create({
    data: {
      employeeId: worker1.id,
      leaveTypeId: sickLeave.id,
      startDate: futureDate1,
      endDate: futureDate1,
      totalDaysRequested: 1,
      startDuration: 'Full',
      endDuration: 'Full',
      reason: 'ปวดท้อง',
      status: 'Approved',
      approvedByHrId: hrUser.id,
      approvalDate: new Date(),
    },
  });
  await prisma.leaveQuota.updateMany({
    where: { employeeId: worker1.id, leaveTypeId: sickLeave.id, year: currentYear },
    data: { usedDays: { increment: 1 } },
  });

  const futureDate2 = new Date();
  futureDate2.setDate(futureDate2.getDate() + 10);
  const req2 = await prisma.leaveRequest.create({
    data: {
      employeeId: worker2.id,
      leaveTypeId: personalLeave.id,
      startDate: futureDate2,
      endDate: futureDate2,
      totalDaysRequested: 0.5,
      startDuration: 'HalfMorning',
      endDuration: 'HalfMorning',
      reason: 'ไปติดต่อราชการ',
      status: 'Pending',
    },
  });

  const futureDate3Start = new Date();
  futureDate3Start.setDate(futureDate3Start.getDate() + 20);
  const futureDate3End = new Date();
  futureDate3End.setDate(futureDate3End.getDate() + 22);
  const req3 = await prisma.leaveRequest.create({
    data: {
      employeeId: worker1.id,
      leaveTypeId: annualLeave.id,
      startDate: futureDate3Start,
      endDate: futureDate3End,
      totalDaysRequested: 3,
      startDuration: 'Full',
      endDuration: 'Full',
      reason: 'ไปเที่ยวญี่ปุ่น',
      status: 'Rejected',
      approvedByHrId: hrUser.id,
      approvalDate: new Date(),
    },
  });
  console.log('✈️ Created Leave Requests.');

  // 7. สร้าง Notifications
  await prisma.notification.create({
    data: {
      employeeId: worker1.id,
      notificationType: 'Approval',
      message: 'คำขอลาป่วยของคุณได้รับการอนุมัติแล้ว',
      relatedRequestId: req1.id,
      isRead: false,
    },
  });
  await prisma.notification.create({
    data: {
      employeeId: hrUser.id,
      notificationType: 'NewRequest',
      message: 'คุณ Suda ได้ส่งคำขอลากิจใหม่',
      relatedRequestId: req2.id,
      isRead: false,
    },
  });
  await prisma.notification.create({
    data: {
      employeeId: worker1.id,
      notificationType: 'Rejection',
      message: 'คำขอลาพักร้อนของคุณถูกปฏิเสธเนื่องจากงานเร่งด่วน',
      relatedRequestId: req3.id,
      isRead: true,
    },
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
