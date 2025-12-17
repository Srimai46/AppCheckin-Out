const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");

// --- Helper Functions ---
const formatShortDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-GB", {
    timeZone: "Asia/Bangkok",
    year: "numeric", month: "2-digit", day: "2-digit",
  });
};

const formatThaiTime = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleTimeString("th-TH", {
    timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit",
  });
};

// 1. ดึงรายชื่อพนักงานทุกคน (สำหรับหน้า List)
exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true, 
        joiningDate: true,
      },
      orderBy: { id: 'asc' }
    });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
};

// 2. ดึงรายละเอียดพนักงานรายคน + โควตา + ประวัติ
exports.getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const currentYear = new Date().getFullYear();

    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(id) },
      include: {
        timeRecords: { orderBy: { workDate: 'desc' }, take: 30 },
        leaveRequestsAsEmployee: { include: { leaveType: true }, orderBy: { startDate: 'desc' } },
        leaveQuotas: { where: { year: currentYear }, include: { leaveType: true } }
      }
    });

    if (!employee) return res.status(404).json({ error: "ไม่พบพนักงาน" });

    const formattedData = {
      info: {
        id: employee.id,
        fullName: `${employee.firstName} ${employee.lastName}`,
        email: employee.email,
        role: employee.role,
        joiningDate: formatShortDate(employee.joiningDate),
        isActive: employee.isActive // ส่งค่าสถานะปัจจุบันไปให้ Frontend
      },
      quotas: employee.leaveQuotas.map(q => ({
        type: q.leaveType.typeName,
        total: Number(q.totalDays),
        used: Number(q.usedDays),
        remaining: Number(q.totalDays) - Number(q.usedDays)
      })),
      attendance: employee.timeRecords.map(record => ({
        id: record.id,
        date: formatShortDate(record.workDate),
        checkIn: formatThaiTime(record.checkInTime),
        checkOut: record.checkOutTime ? formatThaiTime(record.checkOutTime) : "-",
        status: record.isLate ? "สาย" : "ปกติ",
        note: record.note || "-" 
      })),
      leaves: employee.leaveRequestsAsEmployee.map(leave => ({
        id: leave.id,
        type: leave.leaveType.typeName,
        start: formatShortDate(leave.startDate),
        end: formatShortDate(leave.endDate),
        days: Number(leave.totalDaysRequested),
        status: leave.status,
        reason: leave.reason
      }))
    };

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
};

// 3. เปลี่ยนสถานะพนักงาน (PATCH)
exports.updateEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    await prisma.employee.update({
      where: { id: parseInt(id) },
      data: { isActive: isActive }
    });

    res.json({ message: "อัปเดตสถานะสำเร็จ" });
  } catch (error) {
    res.status(500).json({ error: "ไม่สามารถอัปเดตสถานะได้" });
  }
};

// 4. สร้างพนักงานใหม่พร้อมโควตา (Transaction)
exports.createEmployee = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, joiningDate } = req.body;
    const existing = await prisma.employee.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email นี้ถูกใช้งานแล้ว" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const newEmployee = await tx.employee.create({
        data: {
          firstName, lastName, email,
          passwordHash: hashedPassword,
          role: role || "Worker",
          joiningDate: new Date(joiningDate),
          isActive: true
        }
      });

      const leaveTypes = await tx.leaveType.findMany();
      if (leaveTypes.length > 0) {
        await tx.leaveQuota.createMany({
          data: leaveTypes.map(type => ({
            employeeId: newEmployee.id,
            leaveTypeId: type.id,
            year: new Date().getFullYear(),
            totalDays: 30, usedDays: 0
          }))
        });
      }
      return newEmployee;
    });

    res.status(201).json({ message: "เพิ่มพนักงานสำเร็จ", employee: result });
  } catch (error) {
    res.status(500).json({ error: "สร้างพนักงานไม่สำเร็จ" });
  }
};