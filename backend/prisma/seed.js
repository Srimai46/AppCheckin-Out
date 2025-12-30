const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding (Target Year: 2026) with SPECIAL LEAVE...');

  // 1. ล้างข้อมูลเก่า (ยึดตามลำดับ Referential Integrity)
  await prisma.auditLog.deleteMany(); 
  await prisma.notification.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.timeRecord.deleteMany();
  await prisma.specialLeaveGrant.deleteMany(); // 🔥 ลบตาราง Grant ก่อน
  await prisma.leaveQuota.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.workConfiguration.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.systemConfig.deleteMany();
  
  console.log('🧹 Database cleaned.');

  // 2. Work Configurations (24-hour format)
  const configs = [
    { role: 'Worker', startHour: 8, startMin: 0, endHour: 17, endMin: 0 },
    { role: 'HR', startHour: 9, startMin: 0, endHour: 18, endMin: 0 }
  ];
  for (const conf of configs) {
    await prisma.workConfiguration.create({ data: conf });
  }

  // 3. Holidays 2026 (5 วัน)
  const holidays = [
    { date: new Date('2026-01-01T00:00:00Z'), name: "New Year's Day" },
    { date: new Date('2026-04-13T00:00:00Z'), name: "Songkran Festival" },
    { date: new Date('2026-05-01T00:00:00Z'), name: "Labour Day" },
    { date: new Date('2026-07-28T00:00:00Z'), name: "King's Birthday" },
    { date: new Date('2026-12-05T00:00:00Z'), name: "Father's Day" },
  ];
  await prisma.holiday.createMany({ data: holidays });

  // 4. Leave Types (เพิ่ม Special)
  const leaveTypesData = [
    { typeName: 'Sick', isPaid: true, maxCarryOver: 0, maxConsecutiveDays: 30 },
    { typeName: 'Personal', isPaid: true, maxCarryOver: 0, maxConsecutiveDays: 6 },
    { typeName: 'Annual', isPaid: true, maxCarryOver: 12.0, maxConsecutiveDays: 14 },
    { typeName: 'Emergency', isPaid: true, maxCarryOver: 0, maxConsecutiveDays: 98 }, // Emergency
    { typeName: 'Special', isPaid: true, maxCarryOver: 0, maxConsecutiveDays: 365 }, 
  ];
  const leaveTypes = [];
  for (const type of leaveTypesData) {
    const created = await prisma.leaveType.create({ data: type });
    leaveTypes.push(created);
  }

  // Helper หา ID ของ Special Type
  const specialTypeId = leaveTypes.find(t => t.typeName === 'Special').id;

  // 5. Employees (5 คน)
  const passwordHash = await bcrypt.hash('123456', 10);
  const employeeData = [
    { firstName: 'Somsri', lastName: 'HR Manager', email: 'hr@company.com', role: 'HR', joiningDate: new Date('2020-01-01') },
    { firstName: 'Somchai', lastName: 'Senior Worker', email: 'Somchai@company.com', role: 'Worker', joiningDate: new Date('2023-01-15') },
    { firstName: 'Suda', lastName: 'Junior Worker', email: 'worker2@company.com', role: 'Worker', joiningDate: new Date('2025-05-20') },
    { firstName: 'Vichai', lastName: 'Technician', email: 'worker3@company.com', role: 'Worker', joiningDate: new Date('2026-01-10') },
    { firstName: 'Mana', lastName: 'Security', email: 'worker4@company.com', role: 'Worker', joiningDate: new Date('2026-02-01') },
  ];
  const createdEmployees = [];
  for (const emp of employeeData) {
    const created = await prisma.employee.create({ data: { ...emp, passwordHash } });
    createdEmployees.push(created);
  }

  // 6. Leave Quotas 2026
  const targetYear = 2026;
  for (const emp of createdEmployees) {
    for (const lt of leaveTypes) {
      // Special quota เริ่มต้นที่ 0 (จะได้เพิ่มเมื่อมี Grant เท่านั้น)
      const baseDays = lt.typeName === 'Sick' ? 30 : (lt.typeName === 'Special' ? 0 : 6);
      
      await prisma.leaveQuota.create({
        data: {
          employeeId: emp.id,
          leaveTypeId: lt.id,
          year: targetYear,
          totalDays: baseDays, 
          carryOverDays: (lt.typeName === 'Annual' && emp.role === 'HR') ? 5 : 0,
          usedDays: 0,
        }
      });
    }
  }

  // ==========================================
  // 🔥 7. เพิ่ม Special Leave Grant (การมอบสิทธิ์พิเศษ)
  // ==========================================
  // มอบรางวัลวันหยุดพิเศษให้ Somchai (Senior Worker) จำนวน 5 วัน
  const hr = createdEmployees[0];
  const somchai = createdEmployees[1];
  
  const specialGrant = await prisma.specialLeaveGrant.create({
    data: {
      employeeId: somchai.id,
      leaveTypeId: specialTypeId,
      amount: 5.0,
      reason: 'Bonus for completing Mega Project 2025',
      expiryDate: new Date('2026-12-31')
    }
  });

  // 8. Time Records
  const timeRecords = [
    { employeeId: somchai.id, workDate: new Date('2026-01-02'), checkInTime: new Date('2026-01-02T08:00:00Z'), checkOutTime: new Date('2026-01-02T17:00:00Z'), isLate: false },
    { employeeId: somchai.id, workDate: new Date('2026-01-03'), checkInTime: new Date('2026-01-03T08:45:00Z'), checkOutTime: new Date('2026-01-03T17:00:00Z'), isLate: true, note: "Traffic jam" },
    { employeeId: somchai.id, workDate: new Date('2026-01-04'), checkInTime: new Date('2026-01-04T07:55:00Z'), checkOutTime: new Date('2026-01-04T17:05:00Z'), isLate: false },
    { employeeId: somchai.id, workDate: new Date('2026-01-05'), checkInTime: new Date('2026-01-05T08:10:00Z'), checkOutTime: new Date('2026-01-05T17:00:00Z'), isLate: true },
    { employeeId: somchai.id, workDate: new Date('2026-01-06'), checkInTime: new Date('2026-01-06T08:00:00Z'), checkOutTime: null, isLate: false, note: "Forgot to check out" },
  ];
  await prisma.timeRecord.createMany({ data: timeRecords });

  // 9. Leave Requests (รวม Special Request)
  const leaveRequests = [
    { 
      employeeId: somchai.id, leaveTypeId: leaveTypes[0].id, // Sick
      startDate: new Date('2026-01-10'), endDate: new Date('2026-01-10'), totalDaysRequested: 1,
      startDuration: 'Full', endDuration: 'Full', status: 'Approved', reason: 'High fever',
      approvedByHrId: hr.id, approvalDate: new Date()
    },
    { 
      employeeId: createdEmployees[2].id, leaveTypeId: leaveTypes[2].id, // Annual
      startDate: new Date('2026-02-14'), endDate: new Date('2026-02-15'), totalDaysRequested: 2,
      startDuration: 'Full', endDuration: 'Full', status: 'Pending', reason: 'Family trip'
    },
    { 
      employeeId: createdEmployees[3].id, leaveTypeId: leaveTypes[1].id, // Personal
      startDate: new Date('2026-01-20'), endDate: new Date('2026-01-20'), totalDaysRequested: 0.5,
      startDuration: 'HalfMorning', endDuration: 'HalfMorning', status: 'Rejected', rejectionReason: 'Too many workers off'
    },
    { 
      employeeId: createdEmployees[4].id, leaveTypeId: leaveTypes[0].id, // Sick
      startDate: new Date('2026-03-01'), endDate: new Date('2026-03-01'), totalDaysRequested: 1,
      startDuration: 'Full', endDuration: 'Full', status: 'Cancelled', cancelReason: 'Recovered faster'
    },
    // 🔥 เพิ่ม Request ที่ใช้สิทธิ์ Special Leave (เชื่อมกับ Grant)
    { 
      employeeId: somchai.id, leaveTypeId: specialTypeId, // Special
      startDate: new Date('2026-06-01'), endDate: new Date('2026-06-02'), totalDaysRequested: 2,
      startDuration: 'Full', endDuration: 'Full', 
      status: 'Approved', 
      reason: 'Use special reward leave',
      approvedByHrId: hr.id, 
      approvalDate: new Date(),
      isSpecialApproved: true,
      specialGrantId: specialGrant.id // เชื่อมโยงไปที่ Grant ที่สร้างไว้
    }
  ];

  for (const req of leaveRequests) {
    await prisma.leaveRequest.create({ data: req });
  }

  // 10. Audit Logs
  const auditLogs = [
    { action: 'LOGIN', modelName: 'Employee', recordId: hr.id, performedById: hr.id, details: 'HR Manager logged in', ipAddress: '192.168.1.1' },
    { action: 'APPROVE', modelName: 'LeaveRequest', recordId: 1, performedById: hr.id, details: 'Approved Sick leave for Somchai' },
    { action: 'CREATE', modelName: 'SpecialLeaveGrant', recordId: specialGrant.id, performedById: hr.id, details: 'Granted 5 Special days to Somchai' }, // Log การให้สิทธิ์พิเศษ
    { action: 'REJECT', modelName: 'LeaveRequest', recordId: 3, performedById: hr.id, details: 'Rejected Personal leave for Vichai' },
    { action: 'UPDATE', modelName: 'WorkConfiguration', recordId: 1, performedById: hr.id, details: 'Updated Worker start time' },
  ];
  await prisma.auditLog.createMany({ data: auditLogs });

  // 11. System Config 2026
  await prisma.systemConfig.create({
    data: { year: 2026, isClosed: false }
  });

  console.log('✅ SEEDING COMPLETED FOR 2026: Included Special Leave Grant!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });