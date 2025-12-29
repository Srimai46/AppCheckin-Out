const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");
const { auditLog } = require("../utils/logger");

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
    res.status(500).json({ error: "There is something wrong with the server" });
  }
};

// 2. ดึงรายละเอียดพนักงานรายคน + โควตา + ประวัติ
exports.getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // ✅ 1. รับค่าปีจาก Query String (ถ้าไม่มีให้ใช้ปีปัจจุบัน)
    let year = req.query.year 
      ? parseInt(req.query.year, 10) 
      : new Date().getFullYear();

    // ✅ 2. Normalization พ.ศ. เป็น ค.ศ.
    if (year > 2500) year -= 543;

    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(id) },
      include: {
        // ✅ 3. กรองเวลาเข้างานตามปีที่เลือก
        timeRecords: { 
          where: {
            workDate: {
              gte: new Date(`${year}-01-01`),
              lte: new Date(`${year}-12-31`)
            }
          },
          orderBy: { workDate: "desc" } 
        },
        // ✅ 4. กรองรายการลาตามปีที่เลือก
        leaveRequestsAsEmployee: {
          where: {
            startDate: {
              gte: new Date(`${year}-01-01`),
              lte: new Date(`${year}-12-31`)
            }
          },
          include: { leaveType: true },
          orderBy: { startDate: "desc" },
        },
        // ✅ 5. กรองโควตาตามปีที่เลือก
        leaveQuotas: {
          where: { year: year },
          include: { leaveType: true },
        },
      },
    });

    if (!employee) return res.status(404).json({ error: "Not found employee" });

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
      // ✅ 6. ปรับโครงสร้าง Quotas ให้รองรับ Carry Over เหมือนหน้า Dashboard
      quotas: employee.leaveQuotas.map((q) => {
        const base = parseFloat(q.totalDays) || 0;
        const carry = parseFloat(q.carryOverDays) || 0;
        const used = parseFloat(q.usedDays) || 0;
        const totalAvailable = base + carry;

        return {
          type: q.leaveType.typeName,
          baseQuota: base,
          carryOver: carry,
          total: totalAvailable,
          used: used,
          remaining: totalAvailable - used,
          year: q.year
        };
      }),
      attendance: employee.timeRecords.map((record) => ({
        id: record.id,
        date: formatShortDate(record.workDate),
        checkIn: formatThaiTime(record.checkInTime),
        checkOut: record.checkOutTime ? formatThaiTime(record.checkOutTime) : "-",
        status: record.isLate ? "Late" : "On time",
        note: record.note || "-",
      })),
      leaves: employee.leaveRequestsAsEmployee.map((leave) => ({
        id: leave.id,
        type: leave.leaveType.typeName,
        start: formatShortDate(leave.startDate),
        end: formatShortDate(leave.endDate),
        days: Number(leave.totalDaysRequested),
        status: leave.status,
        reason: leave.reason,
        attachmentUrl: leave.attachmentUrl,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Employee data retrieval failed." });
  }
};

// 3. เปลี่ยนสถานะพนักงาน (Active/Inactive)
exports.updateEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const adminId = req.user.id; // ID ของ HR/Admin ที่เป็นคนแก้
    const employeeId = parseInt(id);

    if (isNaN(employeeId)) {
      return res.status(400).json({ error: "Invalid employee ID" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. ดึงข้อมูลเดิมก่อนอัปเดต
      const oldEmployee = await tx.employee.findUnique({
        where: { id: employeeId },
        select: { id: true, firstName: true, lastName: true, isActive: true }
      });

      if (!oldEmployee) {
        throw new Error("Employee not found.");
      }

      // 2. อัปเดตสถานะใหม่
      const updatedEmployee = await tx.employee.update({
        where: { id: employeeId },
        data: { isActive: !!isActive },
      });

      // ✅ 3. บันทึก Audit Log
      await auditLog(tx, {
        action: "UPDATE",
        modelName: "Employee",
        recordId: employeeId,
        userId: adminId,
        details: `Changed status for ${oldEmployee.firstName} ${oldEmployee.lastName} to ${!!isActive ? 'Active' : 'Inactive'}`,
        oldValue: { isActive: oldEmployee.isActive },
        newValue: { isActive: updatedEmployee.isActive },
        req: req
      });

      return updatedEmployee;
    });

    res.json({ 
      message: `Employee status updated to ${result.isActive ? 'Active' : 'Inactive'}`,
      data: result 
    });

  } catch (error) {
    console.error("updateEmployeeStatus Error:", error);
    res.status(400).json({ error: error.message || "Cannot update status" });
  }
};

// 4. สร้างพนักงานใหม่พร้อมโควตา (Transaction)
exports.createEmployee = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, joiningDate } = req.body;
    const adminId = req.user.id; // ID ของ HR/Admin ผู้ทำรายการ

    // ตรวจสอบ Email ซ้ำ
    const existing = await prisma.employee.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email has been used" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const quotaMap = {
      Sick: 30,
      Personal: 6,
      Annual: 6,
      Emergency: 5,
    };

    const currentYear = new Date().getFullYear();

    const result = await prisma.$transaction(async (tx) => {
      // 1. สร้างพนักงานใหม่
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

      // 2. ดึงประเภทวันลาและสร้างโควต้าเริ่มต้น
      const leaveTypes = await tx.leaveType.findMany();
      let quotasCreated = [];

      if (leaveTypes.length > 0) {
        const quotaData = leaveTypes.map((type) => ({
          employeeId: newEmployee.id,
          leaveTypeId: type.id,
          year: currentYear,
          totalDays: Number(quotaMap[type.typeName] ?? 0),
          carryOverDays: 0,
          usedDays: 0,
        }));

        await tx.leaveQuota.createMany({ data: quotaData });
        quotasCreated = quotaData; // เก็บไว้บันทึกใน Log
      }

      // ✅ 3. บันทึก Audit Log (Action: CREATE)
      await auditLog(tx, {
        action: "CREATE",
        modelName: "Employee",
        recordId: newEmployee.id,
        userId: adminId,
        details: `Created new employee: ${firstName} ${lastName} (${email}) with initial quotas.`,
        newValue: {
          employee: {
            id: newEmployee.id,
            firstName: newEmployee.firstName,
            lastName: newEmployee.lastName,
            email: newEmployee.email,
            role: newEmployee.role
          },
          initialQuotas: quotasCreated
        },
        req: req
      });

      return newEmployee;
    });

    res.status(201).json({ message: "Add employee successful", employee: result });
  } catch (error) {
    console.error("createEmployee Error:", error);
    res.status(500).json({ error: "Add employee fail" });
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
    res.status(500).json({ error: "Unable to retrieve statistical data." });
  }
};

// 6. รีเซ็ตรหัสผ่าน (ปรับปรุงสิทธิ์)
exports.resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const requester = req.user; 
    const targetId = parseInt(id);

    // 1. เช็คสิทธิ์
    const isOwner = requester.id === targetId;
    const isHR = requester.role === "HR" || requester.role === "Admin";

    if (!isHR && !isOwner) {
      return res.status(403).json({ error: "No permission to change this password." });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 🚀 2. ใช้ Transaction เพื่อความปลอดภัย
    await prisma.$transaction(async (tx) => {
      const targetUser = await tx.employee.findUnique({
        where: { id: targetId },
        select: { firstName: true, lastName: true, email: true }
      });

      if (!targetUser) throw new Error("Employee not found.");

      // อัปเดตรหัสผ่าน
      await tx.employee.update({
        where: { id: targetId },
        data: { passwordHash: hashedPassword },
      });

      // ✅ 3. บันทึก Audit Log
      await auditLog(tx, {
        action: "UPDATE", // หรือใช้ "RESET_PASSWORD"
        modelName: "Employee",
        recordId: targetId,
        userId: requester.id,
        details: isOwner 
          ? `User reset their own password.` 
          : `HR (${requester.firstName}) reset password for ${targetUser.firstName} ${targetUser.lastName}`,
        oldValue: { action: "password_change_requested" },
        newValue: { action: "password_changed_successfully" }, // ❌ ห้ามเก็บรหัสผ่านที่นี่
        req: req
      });
    });

    res.json({ message: "Password reset successful." });
  } catch (error) {
    console.error("resetPassword Error:", error);
    res.status(400).json({ error: error.message || "Failed to reset password." });
  }
};

// 7. แก้ไขข้อมูลพนักงาน (ชื่อ-นามสกุล)
exports.updateEmployee = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { firstName, lastName, email, role } = req.body;
    const adminId = req.user.id; // HR/Admin ที่เป็นคนสั่งแก้ไข

    // ✅ Validate Roles
    const allowedRoles = ["Worker", "HR"];
    if (role !== undefined) {
      const r = String(role).trim();
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
    if (role !== undefined) dataToUpdate.role = String(role).trim();

    // 🚀 ใช้ Transaction เพื่อความถูกต้องของข้อมูลและ Log
    const result = await prisma.$transaction(async (tx) => {
      // 1. ดึงข้อมูลเดิมก่อนอัปเดตเพื่อเก็บลง Log
      const oldEmployee = await tx.employee.findUnique({
        where: { id },
        select: { firstName: true, lastName: true, email: true, role: true }
      });

      if (!oldEmployee) {
        throw { code: "P2025" }; // ส่งต่อให้ catch จัดการเป็น 404
      }

      // 2. อัปเดตข้อมูลพนักงาน
      const updated = await tx.employee.update({
        where: { id },
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

      // ✅ 3. บันทึก Audit Log (เปรียบเทียบค่าเก่าและใหม่)
      await auditLog(tx, {
        action: "UPDATE",
        modelName: "Employee",
        recordId: id,
        userId: adminId,
        details: `Updated info for ${oldEmployee.firstName} ${oldEmployee.lastName}. Changed fields: ${Object.keys(dataToUpdate).join(", ")}`,
        oldValue: oldEmployee, // ข้อมูลก่อนเปลี่ยน
        newValue: updated,    // ข้อมูลหลังเปลี่ยน
        req: req
      });

      return updated;
    });

    return res.json({ message: "Employee updated", employee: result });

  } catch (err) {
    console.error("UpdateEmployee Error:", err);

    if (err.code === "P2002") {
      return res.status(400).json({ error: "This email address is already in use." });
    }
    if (err.code === "P2025" || err.status === 404) {
      return res.status(404).json({ error: "No employees requiring update were found." });
    }

    return res.status(500).json({ error: "Update employee failed" });
  }
};
