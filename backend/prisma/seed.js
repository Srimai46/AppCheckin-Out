const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding (2025 Updated)...');

  // 1. ล้างข้อมูลเก่า (เพิ่ม SystemConfig)
  await prisma.notification.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.timeRecord.deleteMany();
  await prisma.specialLeaveGrant.deleteMany();
  await prisma.leaveQuota.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.systemConfig.deleteMany(); // ล้าง Config เก่าออกด้วย
  console.log('🧹 Cleaned old data including SystemConfig.');

  // 2. สร้าง Leave Types
  const leaveTypesData = [
    { typeName: 'Sick', isPaid: true, maxCarryOver: 0, maxConsecutiveDays: 30 },
    { typeName: 'Personal', isPaid: true, maxCarryOver: 0, maxConsecutiveDays: 3 },
    { typeName: 'Annual', isPaid: true, maxCarryOver: 12.0, maxConsecutiveDays: 10 },
    { typeName: 'Emergency', isPaid: true, maxCarryOver: 0, maxConsecutiveDays: 2 },
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
      joiningDate: new Date('2023-05-15'),
    },
  });

  const worker2 = await prisma.employee.create({
    data: {
      firstName: 'Suda',
      lastName: 'NewStaff',
      email: 'suda@company.com',
      passwordHash,
      role: 'Worker',
      joiningDate: new Date('2025-02-01'),
    },
  });
  console.log('👤 Created Employees.');

  // 4. แจก Quotas เฉพาะปี 2025
  const currentYear = 2025;
  const employees = [hrUser, worker1, worker2];

  for (const emp of employees) {
    for (const typeName in leaveTypes) {
      let totalDays =
        typeName === "Sick" ? 30 :
        typeName === "Personal" ? 6 :
        typeName === "Annual" ? 6 :
        typeName === "Emergency" ? 5 : 0;

      // สมมติ worker1 มีวันลาทบมาจากปี 2024
      let carryOver = (typeName === "Annual" && emp.id === worker1.id) ? 4.5 : 0;

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
  console.log(`📊 Created Leave Quotas for ${currentYear}.`);

  // 5. สร้างสถานะ SystemConfig (เพื่อทดสอบ Logic ปิดงวด)
  // สมมติว่าปี 2024 ปิดงวดไปแล้ว เพื่อให้ระบบอนุญาตให้รัน Carry Over มาปี 2025 ได้
  await prisma.systemConfig.create({
    data: {
      year: 2024,
      isClosed: true,
      closedAt: new Date('2024-12-31T23:59:59Z'),
      processedBy: hrUser.id
    }
  });
  console.log('⚙️ Initialized SystemConfig for 2024.');

  // --- ส่วนที่เหลือ (TimeRecord, LeaveRequest, Notification) ใช้ของเดิมได้เลย ---
  // (ข้ามไปขั้นตอนจบ)

  console.log('✅ Seeding completed with SystemConfig support!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });