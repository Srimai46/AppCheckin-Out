const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding (2025 Architecture Optimized)...');

  // 1. ล้างข้อมูลเก่าตามลำดับความสัมพันธ์
  await prisma.notification.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.timeRecord.deleteMany();
  await prisma.specialLeaveGrant.deleteMany();
  await prisma.leaveQuota.deleteMany();
  await prisma.holiday.deleteMany(); // ✅ เพิ่มการล้างวันหยุด
  await prisma.leaveType.deleteMany();
  await prisma.workConfiguration.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.systemConfig.deleteMany();
  console.log('🧹 Database cleaned.');

  // 2. สร้าง Work Configurations (เกณฑ์เวลาทำงานตาม Role)
  const configs = [
    { role: 'Worker', startHour: 8, startMin: 0, endHour: 17, endMin: 0 },
    { role: 'HR', startHour: 9, startMin: 0, endHour: 18, endMin: 0 }
  ];

  for (const conf of configs) {
    await prisma.workConfiguration.create({ data: conf });
  }
  console.log('⏰ Work Configurations established.');

  // 3. สร้างวันหยุดประจำปี 2025 (Holidays)
  // ✅ เพิ่มเพื่อให้ Logic การคำนวณวันลาข้ามวันหยุดทำงานได้
  const holidays2025 = [
    { date: new Date('2026-01-01T00:00:00Z'), name: "New Year's Day" },
    { date: new Date('2025-04-13T00:00:00Z'), name: "Songkran Festival" },
    { date: new Date('2025-04-14T00:00:00Z'), name: "Songkran Festival" },
    { date: new Date('2025-04-15T00:00:00Z'), name: "Songkran Festival" },
    { date: new Date('2025-05-01T00:00:00Z'), name: "National Labour Day" },
    { date: new Date('2025-12-05T00:00:00Z'), name: "King Bhumibol Birthday" },
  ];

  await prisma.holiday.createMany({ data: holidays2025 });
  console.log('🏖️ Holidays for 2025 initialized.');

  // 4. สร้าง Leave Types
  const leaveTypesData = [
    { typeName: 'Sick', isPaid: true, maxCarryOver: 0, maxConsecutiveDays: 30 },
    { typeName: 'Personal', isPaid: true, maxCarryOver: 0, maxConsecutiveDays: 3 },
    { typeName: 'Annual', isPaid: true, maxCarryOver: 12.0, maxConsecutiveDays: 10 },
    { typeName: 'Emergency', isPaid: true, maxCarryOver: 0, maxConsecutiveDays: 2 },
    { typeName: 'Special', isPaid: true, maxCarryOver: 0, maxConsecutiveDays: 99 },
  ];

  const leaveTypes = {};
  for (const type of leaveTypesData) {
    const created = await prisma.leaveType.create({ data: type });
    leaveTypes[type.typeName] = created;
  }
  console.log('📝 Leave Types initialized.');

  // 5. สร้าง Employees
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
  console.log('👤 Employee data established.');

  // 6. แจก Quotas ประจำปี 2025
  const currentYear = 2025;
  const employees = [hrUser, worker1, worker2];

  for (const emp of employees) {
    for (const typeName in leaveTypes) {
      let totalDays =
        typeName === "Sick" ? 30 :
        typeName === "Personal" ? 6 :
        typeName === "Annual" ? 6 :
        typeName === "Emergency" ? 5 : 0; 

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
  console.log(`📊 Quotas for ${currentYear} distributed.`);

  // 7. ตั้งค่าระบบ (System Config)
  // ✅ ปิดงวดปี 2024
  await prisma.systemConfig.create({
    data: {
      year: 2024,
      isClosed: true,
      closedAt: new Date('2024-12-31T23:59:59Z'),
      processedBy: hrUser.id
    }
  });

  // ✅ เปิดงวดปี 2025 (สำคัญมาก: ถ้าไม่สร้าง พนักงานจะลางานไม่ได้เพราะติดเช็ค isClosed)
  await prisma.systemConfig.create({
    data: {
      year: 2025,
      isClosed: false,
    }
  });
  console.log('⚙️ System Config 2024 (Locked) and 2025 (Open) established.');

  console.log('✅ SEEDING COMPLETED SUCCESSFULLY!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });