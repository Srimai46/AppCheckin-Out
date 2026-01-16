// prisma/seed.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding (Target Year: 2026) with i18n support...');

  // ==========================================
  // 1. ล้างข้อมูลเก่า (เรียงลำดับ Child -> Parent)
  // ==========================================
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.specialLeaveGrant.deleteMany();
  await prisma.timeRecord.deleteMany();
  await prisma.leaveQuota.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.workConfiguration.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.systemConfig.deleteMany();
  await prisma.holidayPolicy.deleteMany(); // เพิ่มการลบ Policy ด้วย

  console.log('🧹 Database cleaned.');

  // ==========================================
  // 2. Work Configurations
  // ==========================================
  const configs = [
    { role: 'WORKER', startHour: 8, startMin: 0, endHour: 17, endMin: 0 },
    { role: 'HR', startHour: 9, startMin: 0, endHour: 18, endMin: 0 }
  ];
  for (const conf of configs) {
    await prisma.workConfiguration.create({ data: conf });
  }

  // ==========================================
  // 3. Holidays 2026 (i18n: name เป็น JSON)
  // ==========================================
  const holidays = [
    { 
      date: new Date('2026-01-01T00:00:00Z'), 
      name: { th: "วันขึ้นปีใหม่", en: "New Year's Day" ,ja: "お正月" } 
    },
    { 
      date: new Date('2026-04-13T00:00:00Z'), 
      name: { th: "วันสงกรานต์", en: "Songkran Festival" ,ja: "ソンクラーン祭り" } 
    },
    { 
      date: new Date('2026-05-01T00:00:00Z'), 
      name: { th: "วันแรงงานแห่งชาติ", en: "Labour Day" , ja: "メーデー（労働者の日）" } 
    },
    { 
      date: new Date('2026-07-28T00:00:00Z'), 
      name: { th: "วันเฉลิมพระชนมพรรษา ร.10", en: "King's Birthday" , ja: "国王誕生日" } 
    },
    { 
      date: new Date('2026-12-05T00:00:00Z'), 
      name: { th: "วันพ่อแห่งชาติ", en: "Father's Day", ja: "父の日" } 
    },
  ];
  await prisma.holiday.createMany({ data: holidays });

  // ==========================================
  // 4. Leave Types (i18n: เพิ่ม label JSON)
  // ==========================================
  const leaveTypesData = [
    { 
      typeName: 'Sick', 
      label: { th: "ลาป่วย", en: "Sick Leave" ,ja: "病気休暇"}, 
      isPaid: true, maxCarryOver: 0, maxConsecutiveDays: 0 
    },
    { 
      typeName: 'Personal', 
      label: { th: "ลากิจ", en: "Personal Leave" ,ja: "私事休暇"}, 
      isPaid: true, maxCarryOver: 0, maxConsecutiveDays: 0 
    },
    { 
      typeName: 'Annual', 
      label: { th: "ลาพักร้อน", en: "Annual Leave" ,ja: "年次休暇"}, 
      isPaid: true, maxCarryOver: 12.0, maxConsecutiveDays: 0 
    },
    { 
      typeName: 'Emergency', 
      label: { th: "ลาฉุกเฉิน", en: "Emergency Leave"  ,ja: "緊急休暇"}, 
      isPaid: true, maxCarryOver: 0, maxConsecutiveDays: 0 
    },
    { 
      typeName: 'Special', 
      label: { th: "ลาพิเศษ", en: "Special Leave"  ,ja: "特別休暇"}, 
      isPaid: true, maxCarryOver: 0, maxConsecutiveDays: 365 
    }, 
  ];

  const leaveTypes = [];
  for (const type of leaveTypesData) {
    const created = await prisma.leaveType.create({ data: type });
    leaveTypes.push(created);
  }

  // Helper หา ID ตาม typeName
  const getTypeId = (name) => leaveTypes.find(t => t.typeName === name).id;

  // ==========================================
  // 5. Employees
  // ==========================================
  const passwordHash = await bcrypt.hash('123456', 10);
  const employeeData = [
    { firstName: 'Somsri', lastName: 'HR Manager', email: 'hr@company.com', role: 'HR', joiningDate: new Date('2020-01-01') },
    { firstName: 'Somchai', lastName: 'Senior Worker', email: 'Somchai@company.com', role: 'WORKER', joiningDate: new Date('2023-01-15') },
    { firstName: 'Suda', lastName: 'Junior Worker', email: 'worker2@company.com', role: 'WORKER', joiningDate: new Date('2025-05-20') },
    { firstName: 'Vichai', lastName: 'Technician', email: 'worker3@company.com', role: 'WORKER', joiningDate: new Date('2026-01-10') },
    { firstName: 'Mana', lastName: 'Security', email: 'worker4@company.com', role: 'WORKER', joiningDate: new Date('2026-02-01') },
  ];

  const createdEmployees = [];
  for (const emp of employeeData) {
    const created = await prisma.employee.create({ data: { ...emp, passwordHash } });
    createdEmployees.push(created);
  }

  const hr = createdEmployees[0];
  const somchai = createdEmployees[1];
  const suda = createdEmployees[2];
  const vichai = createdEmployees[3];
  const mana = createdEmployees[4];

  // ==========================================
  // 6. Leave Quotas 2026
  // ==========================================
  const targetYear = 2026;
  for (const emp of createdEmployees) {
    for (const lt of leaveTypes) {
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
  // 7. Special Leave Grant
  // ==========================================
  const specialGrant = await prisma.specialLeaveGrant.create({
    data: {
      employeeId: somchai.id,
      leaveTypeId: getTypeId('Special'),
      amount: 5.0,
      reason: 'Bonus for completing Mega Project 2025',
      expiryDate: new Date('2026-12-31')
    }
  });

  // ==========================================
  // 8. Time Records
  // ==========================================
  const timeRecords = [
    { employeeId: somchai.id, workDate: new Date('2026-01-02'), checkInTime: new Date('2026-01-02T08:00:00Z'), checkOutTime: new Date('2026-01-02T17:00:00Z'), isLate: false },
    { employeeId: somchai.id, workDate: new Date('2026-01-03'), checkInTime: new Date('2026-01-03T08:45:00Z'), checkOutTime: new Date('2026-01-03T17:00:00Z'), isLate: true, note: "Traffic jam" },
    { employeeId: somchai.id, workDate: new Date('2026-01-04'), checkInTime: new Date('2026-01-04T07:55:00Z'), checkOutTime: new Date('2026-01-04T17:05:00Z'), isLate: false },
    { employeeId: somchai.id, workDate: new Date('2026-01-05'), checkInTime: new Date('2026-01-05T08:10:00Z'), checkOutTime: new Date('2026-01-05T17:00:00Z'), isLate: true },
    { employeeId: somchai.id, workDate: new Date('2026-01-06'), checkInTime: new Date('2026-01-06T08:00:00Z'), checkOutTime: null, isLate: false, note: "Forgot to check out" },
  ];
  await prisma.timeRecord.createMany({ data: timeRecords });

  // ==========================================
  // 9. Leave Requests
  // ==========================================
  
  // 9.1 Sick Leave (Approved)
  const req1 = await prisma.leaveRequest.create({
    data: { 
      employeeId: somchai.id, leaveTypeId: getTypeId('Sick'), 
      startDate: new Date('2026-01-10'), endDate: new Date('2026-01-10'), totalDaysRequested: 1,
      startDuration: 'Full', endDuration: 'Full', status: 'Approved', reason: 'High fever',
      approvedByHrId: hr.id, approvalDate: new Date()
    }
  });

  // 9.2 Annual Leave (Pending)
  const req2 = await prisma.leaveRequest.create({
    data: { 
      employeeId: suda.id, leaveTypeId: getTypeId('Annual'), 
      startDate: new Date('2026-02-14'), endDate: new Date('2026-02-15'), totalDaysRequested: 2,
      startDuration: 'Full', endDuration: 'Full', status: 'Pending', reason: 'Family trip'
    }
  });

  // 9.3 Personal Leave (Rejected)
  const req3 = await prisma.leaveRequest.create({
    data: { 
      employeeId: vichai.id, leaveTypeId: getTypeId('Personal'), 
      startDate: new Date('2026-01-20'), endDate: new Date('2026-01-20'), totalDaysRequested: 0.5,
      startDuration: 'HalfMorning', endDuration: 'HalfMorning', status: 'Rejected', rejectionReason: 'Too many workers off'
    }
  });

  // 9.4 Sick Leave (Cancelled)
  const req4 = await prisma.leaveRequest.create({
    data: { 
      employeeId: mana.id, leaveTypeId: getTypeId('Sick'), 
      startDate: new Date('2026-03-01'), endDate: new Date('2026-03-01'), totalDaysRequested: 1,
      startDuration: 'Full', endDuration: 'Full', status: 'Cancelled', cancelReason: 'Recovered faster'
    }
  });

  // 9.5 Special Leave (Approved & Linked)
  const req5 = await prisma.leaveRequest.create({
    data: { 
      employeeId: somchai.id, leaveTypeId: getTypeId('Special'), 
      startDate: new Date('2026-06-01'), endDate: new Date('2026-06-02'), totalDaysRequested: 2,
      startDuration: 'Full', endDuration: 'Full', 
      status: 'Approved', 
      reason: 'Use special reward leave',
      approvedByHrId: hr.id, 
      approvalDate: new Date(),
      isSpecialApproved: true,
      specialGrantId: specialGrant.id
    }
  });

  // ==========================================
  // 10. Audit Logs
  // ==========================================
  const auditLogs = [
    { 
      action: 'LOGIN', modelName: 'Employee', recordId: hr.id, performedById: hr.id, 
      details: 'HR Manager logged in', ipAddress: '192.168.1.1' 
    },
    { 
      action: 'APPROVE', modelName: 'LeaveRequest', recordId: req1.id, performedById: hr.id, 
      details: 'Approved Sick leave for Somchai' 
    },
    { 
      action: 'CREATE', modelName: 'SpecialLeaveGrant', recordId: specialGrant.id, performedById: hr.id, 
      details: 'Granted 5 Special days to Somchai' 
    },
    { 
      action: 'REJECT', modelName: 'LeaveRequest', recordId: req3.id, performedById: hr.id, 
      details: 'Rejected Personal leave for Vichai' 
    },
    // Work Configuration
    { 
      action: 'UPDATE', modelName: 'WorkConfiguration', recordId: 1, performedById: hr.id, 
      details: 'Updated Worker start time' 
    },
  ];
  await prisma.auditLog.createMany({ data: auditLogs });

  // ==========================================
  // 11. System Config 2026
  // ==========================================
  await prisma.systemConfig.create({
    data: { year: 2026, isClosed: false, maxConsecutiveDays: 0 }
  });

  console.log('✅ SEEDING COMPLETED FOR 2026: Included i18n & Special Leave Grant!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });