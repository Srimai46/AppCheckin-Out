const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding (2025 Architecture Optimized)...');

  // 1. ล้างข้อมูลเก่าตามลำดับความสัมพันธ์ (ป้องกัน Foreign Key Error)
  // ต้องลบตารางที่มีความสัมพันธ์ลูก (Child) ก่อนตารางหลัก (Parent)
  await prisma.notification.deleteMany();
  await prisma.leaveRequest.deleteMany(); // ต้องลบก่อน SpecialLeaveGrant เพราะมีความสัมพันธ์เชื่อมกัน
  await prisma.timeRecord.deleteMany();
  await prisma.specialLeaveGrant.deleteMany();
  await prisma.leaveQuota.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.systemConfig.deleteMany();
  console.log('🧹 Database cleaned.');

  // 2. สร้าง Leave Types
  // เพิ่ม 'Special' เพื่อรองรับระบบอนุมัติพิเศษแบบไม่หักโควตาปกติ
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
  console.log('👤 Employee data established.');

  // 4. แจก Quotas ประจำปี 2025
  const currentYear = 2025;
  const employees = [hrUser, worker1, worker2];

  for (const emp of employees) {
    for (const typeName in leaveTypes) {
      // 'Special' จะเริ่มที่ 0 วันเสมอ เพราะจะได้ยอดจากการมอบสิทธิ์พิเศษเท่านั้น
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

  // 5. ปิดงวดปี 2024 เพื่อรองรับระบบ Carry Over
  await prisma.systemConfig.create({
    data: {
      year: 2024,
      isClosed: true,
      closedAt: new Date('2024-12-31T23:59:59Z'),
      processedBy: hrUser.id
    }
  });
  console.log('⚙️ System Config 2024 locked.');

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