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
    timeZone: "Asia/Bangkok",
    hour: "2-digit", minute: "2-digit",
  });
};

// 1. ดึงรายชื่อพนักงานทุกคน
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
      orderBy: { id: "asc" },
    });
    res.json(employees);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
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
        timeRecords: { orderBy: { workDate: "desc" }, take: 30 },
        leaveRequestsAsEmployee: {
          include: { leaveType: true },
          orderBy: { startDate: "desc" },
        },
        leaveQuotas: {
          where: { year: currentYear },
          include: { leaveType: true },
        },
      },
    });

    if (!employee) return res.status(404).json({ error: "ไม่พบพนักงาน" });

    res.json({
      info: {
        id: employee.id,
        fullName: `${employee.firstName} ${employee.lastName}`,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        role: employee.role,
        joiningDate: formatShortDate(employee.joiningDate),
        isActive: employee.isActive,
      },
      quotas: employee.leaveQuotas.map((q) => ({
        type: q.leaveType.typeName,
        total: Number(q.totalDays),
        used: Number(q.usedDays),
        remaining: Number(q.totalDays) - Number(q.usedDays),
      })),
      attendance: employee.timeRecords.map((record) => ({
        id: record.id,
        date: formatShortDate(record.workDate),
        checkIn: formatThaiTime(record.checkInTime),
        checkOut: record.checkOutTime ? formatThaiTime(record.checkOutTime) : "-",
        status: record.isLate ? "สาย" : "ปกติ",
        note: record.note || "-",
      })),
      // ✅ แก้ไขส่วนนี้: เพิ่ม attachmentUrl ลงในก้อนข้อมูล leaves
      leaves: employee.leaveRequestsAsEmployee.map((leave) => ({
        id: leave.id,
        type: leave.leaveType.typeName,
        start: formatShortDate(leave.startDate),
        end: formatShortDate(leave.endDate),
        days: Number(leave.totalDaysRequested),
        status: leave.status,
        reason: leave.reason,
        attachmentUrl: leave.attachmentUrl, // 👈 เพิ่มบรรทัดนี้เพื่อส่งข้อมูลไฟล์แนบ
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "ไม่สามารถดึงข้อมูลพนักงานได้" });
  }
};

// 3. เปลี่ยนสถานะพนักงาน (Active/Inactive)
exports.updateEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    console.log("PUT /employees/:id called", {
      params: req.params,
      body: req.body,
      user: req.user,
    });

    await prisma.employee.update({
      where: { id: parseInt(id) },
      data: { isActive: !!isActive }, // มั่นใจว่าเป็น boolean
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

    // ✅ ตารางวันลาเริ่มต้น (ตรงกับภาพแรก)
    const quotaMap = {
      Sick: 30,
      Personal: 6,
      Annual: 10,
      Emergency: 5,
    };

    const currentYear = new Date().getFullYear();

    const result = await prisma.$transaction(async (tx) => {
      const newEmployee = await tx.employee.create({
        data: {
          firstName,
          lastName,
          email,
          passwordHash: hashedPassword,
          role: role || "Worker",
          joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
          isActive: true,
        },
      });

      const leaveTypes = await tx.leaveType.findMany();

      if (leaveTypes.length > 0) {
        await tx.leaveQuota.createMany({
          data: leaveTypes.map((type) => ({
            employeeId: newEmployee.id,
            leaveTypeId: type.id,
            year: currentYear,
            totalDays: Number(quotaMap[type.typeName] ?? 0), // ✅ ใช้ตามประเภทลา
            carryOverDays: 0,
            usedDays: 0,
          })),
        });
      }

      return newEmployee;
    });

    res.status(201).json({ message: "เพิ่มพนักงานสำเร็จ", employee: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "สร้างพนักงานไม่สำเร็จ" });
  }
};

// 5. ดึงสถิติการเข้างานรายวัน
exports.getAttendanceStats = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const totalEmployees = await prisma.employee.count({ where: { isActive: true } });

    const records = await prisma.timeRecord.findMany({
      where: { workDate: { gte: startOfDay, lte: endOfDay } },
      include: { employee: { select: { firstName: true, lastName: true } } },
    });

    res.json({
      selectedDate: formatShortDate(startOfDay),
      totalEmployees,
      checkedIn: records.length,
      late: records.filter((r) => r.isLate).length,
      absent: Math.max(0, totalEmployees - records.length),
      lateDetails: records.filter((r) => r.isLate).map((r) => ({
        name: `${r.employee.firstName} ${r.employee.lastName}`,
        time: formatThaiTime(r.checkInTime),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: "ไม่สามารถดึงข้อมูลสถิติได้" });
  }
};

// 6. รีเซ็ตรหัสผ่าน (ปรับปรุงสิทธิ์)
exports.resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const requester = req.user; // มาจาก middleware protect

    // เช็คสิทธิ์: ต้องเป็น HR/Admin หรือเจ้าของ ID นั้นเอง
    const canAccess = requester.role === "HR" || requester.role === "Admin" || requester.id === parseInt(id);
    
    if (!canAccess) {
      return res.status(403).json({ error: "คุณไม่มีสิทธิ์เปลี่ยนรหัสผ่านของผู้อื่น" });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.employee.update({
      where: { id: parseInt(id) },
      data: { passwordHash: hashedPassword },
    });

    res.json({ message: "รีเซ็ตรหัสผ่านสำเร็จแล้ว" });
  } catch (error) {
    res.status(500).json({ error: "ไม่สามารถรีเซ็ตรหัสผ่านได้" });
  }
};

// 7. แก้ไขข้อมูลพนักงาน (ชื่อ-นามสกุล)
exports.updateEmployee = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const { firstName, lastName, email, role } = req.body;

    // ✅ enum ใน schema มีแค่ Worker, HR
    const allowedRoles = ["Worker", "HR"];

    if (role !== undefined) {
      const r = String(role).trim(); // กันช่องว่าง
      if (!allowedRoles.includes(r)) {
        return res.status(400).json({
          error: `Invalid role (allowed: ${allowedRoles.join(", ")})`,
        });
      }
    }

    const dataToUpdate = {};
    if (firstName !== undefined) dataToUpdate.firstName = firstName;
    if (lastName !== undefined) dataToUpdate.lastName = lastName;
    if (email !== undefined) dataToUpdate.email = email;
    if (role !== undefined) dataToUpdate.role = String(role).trim(); // ✅ ต้องเป็น Worker/HR

    const updated = await prisma.employee.update({
      where: { id }, // ✅ ถูกแล้ว เพราะ model ใช้ id (map employee_id)
      data: dataToUpdate,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        joiningDate: true,
      },
    });

    return res.json({ message: "Employee updated", employee: updated });
  } catch (err) {
    console.error(err);

    if (err.code === "P2002") {
      return res.status(400).json({ error: "Email นี้ถูกใช้งานแล้ว" });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: "ไม่พบพนักงานที่ต้องการอัปเดต" });
    }

    return res.status(500).json({ error: "Update employee failed" });
  }
};
