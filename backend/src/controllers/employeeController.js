// controllers/employeeController.js
const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");
const { auditLog } = require("../utils/logger");

// ==============================
// ✅ Role helpers
// ==============================
const normalizeRole = (val) => {
  const raw = String(val ?? "").trim();
  const up = raw.toUpperCase();

  if (up === "HR") return "HR";
  if (up === "WORKER" || up === "WORK") return "WORKER";
  if (raw === "Worker") return "WORKER";

  return null;
};

const presentRole = (val) => {
  const up = String(val ?? "").trim().toUpperCase();
  if (up === "WORKER") return "Worker";
  if (up === "HR") return "HR";
  return val;
};

// ==============================
// ✅ NEW: Department Helper
// ==============================
const normalizeDepartment = (val) => {
  if (!val) return "GENERAL"; // Default ถ้าไม่ส่งมา
  const validDepts = [
    "HR", "IT", "ACCOUNTING", "MARKETING", 
    "SALES", "OPERATIONS", "MANAGEMENT", "GENERAL"
  ];
  const up = String(val).toUpperCase().trim();
  return validDepts.includes(up) ? up : "GENERAL";
};

// --- Helper Functions (เหมือนเดิม) ---
const formatShortDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-GB", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const formatThaiTime = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleTimeString("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const timeToMinutesBangkok = (dateObj) => {
  if (!dateObj) return null;
  const t = new Date(dateObj).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const m = String(t).match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
};

const hhmmToMinutes = (val) => {
  if (!val) return null;
  const s = String(val).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
};

const normalizeEndTimeToHHmm = (val) => {
  if (!val) return null;
  if (val instanceof Date) {
    const hhmm = val.toLocaleTimeString("en-GB", {
      timeZone: "Asia/Bangkok",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return hhmm || null;
  }
  const s = String(val).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const hh = String(m[1]).padStart(2, "0");
  const mm = String(m[2]).padStart(2, "0");
  return `${hh}:${mm}`;
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
        department: true, // ✅ NEW: เพิ่ม field department
        isActive: true,
        joiningDate: true,
      },
      orderBy: { id: "asc" },
    });

    res.json(
      employees.map((e) => ({
        ...e,
        role: presentRole(e.role),
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "There is something wrong with the server" });
  }
};

// 2. ดึงรายละเอียดพนักงานรายคน + โควตา + ประวัติ
exports.getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    let year = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();
    if (year > 2500) year -= 543;

    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(id) },
      include: {
        timeRecords: {
          where: {
            workDate: {
              gte: new Date(`${year}-01-01`),
              lte: new Date(`${year}-12-31`),
            },
          },
          orderBy: { workDate: "desc" },
        },
        leaveRequestsAsEmployee: {
          where: {
            startDate: {
              gte: new Date(`${year}-01-01`),
              lte: new Date(`${year}-12-31`),
            },
          },
          include: { leaveType: true },
          orderBy: { startDate: "desc" },
        },
        leaveQuotas: {
          where: { year: year },
          include: { leaveType: true },
        },
      },
    });

    if (!employee) return res.status(404).json({ error: "Not found employee" });

    const roleForConfig = employee.role;
    const workCfg = await prisma.workConfiguration.findUnique({
      where: { role: roleForConfig },
      select: { endHour: true, endMin: true, startHour: true, startMin: true, role: true },
    });

    const workEndTime =
      workCfg && Number.isFinite(workCfg.endHour) && Number.isFinite(workCfg.endMin)
        ? `${String(workCfg.endHour).padStart(2, "0")}:${String(workCfg.endMin).padStart(2, "0")}`
        : null;

    const endMin = hhmmToMinutes(workEndTime);

    res.json({
      workEndTime,
      info: {
        id: employee.id,
        fullName: `${employee.firstName} ${employee.lastName}`,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        role: presentRole(employee.role),
        department: employee.department, // ✅ NEW: ส่ง department กลับไป
        joiningDate: formatShortDate(employee.joiningDate),
        isActive: employee.isActive,
      },
      // ... (quotas, attendance, leaves เหมือนเดิม)
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
          year: q.year,
        };
      }),
      attendance: employee.timeRecords.map((record) => {
        const outMin = timeToMinutesBangkok(record.checkOutTime);
        const isEarly = endMin != null && outMin != null ? outMin < endMin : false;
        const checkOutStatus = !record.checkOutTime
          ? "NO_CHECKOUT"
          : isEarly
          ? "EARLY"
          : "NORMAL";
        return {
          id: record.id,
          workDate: record.workDate,
          dateDisplay: formatShortDate(record.workDate),
          checkInTime: record.checkInTime,
          checkOutTime: record.checkOutTime,
          checkInTimeDisplay: record.checkInTime ? formatThaiTime(record.checkInTime) : "-",
          checkOutTimeDisplay: record.checkOutTime ? formatThaiTime(record.checkOutTime) : "-",
          isLate: !!record.isLate,
          note: record.note || "-",
          checkInStatus: record.checkInTime ? (record.isLate ? "LATE" : "ON_TIME") : "ABSENT",
          checkOutStatus,
        };
      }),
      leaves: employee.leaveRequestsAsEmployee.map((leave) => ({
        id: leave.id,
        leaveType: leave.leaveType,
        leaveTypeId: leave.leaveTypeId,
        typeName: leave.leaveType?.typeName,
        startDate: leave.startDate,
        endDate: leave.endDate,
        totalDaysRequested: Number(leave.totalDaysRequested),
        status: leave.status,
        reason: leave.reason,
        attachmentUrl: leave.attachmentUrl,
        rejectionReason: leave.rejectionReason || null,
        cancelReason: leave.cancelReason || null,
        requestedAt: leave.requestedAt || null,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Employee data retrieval failed." });
  }
};

// 3. เปลี่ยนสถานะพนักงาน (เหมือนเดิม)
exports.updateEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const adminId = req.user.id;
    const employeeId = parseInt(id);

    if (isNaN(employeeId)) {
      return res.status(400).json({ error: "Invalid employee ID" });
    }

    const adminUser = await prisma.employee.findUnique({
      where: { id: adminId },
      select: { firstName: true, lastName: true },
    });

    const result = await prisma.$transaction(async (tx) => {
      const oldEmployee = await tx.employee.findUnique({
        where: { id: employeeId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          isActive: true,
        },
      });

      if (!oldEmployee) {
        throw new Error("Employee not found.");
      }

      const updatedEmployee = await tx.employee.update({
        where: { id: employeeId },
        data: { isActive: !!isActive },
      });

      const statusText = !!isActive ? "Active" : "Inactive";

      const cleanNewValue = {
        name: `${oldEmployee.firstName} ${oldEmployee.lastName}`,
        email: oldEmployee.email,
        role: oldEmployee.role,
        status: statusText,
        action: !!isActive ? "Reinstated" : "Terminated",
      };

      const auditDetails = `Changed status for ${oldEmployee.firstName} ${oldEmployee.lastName} to ${statusText}`;

      await auditLog(tx, {
        action: "UPDATE",
        modelName: "Employee",
        recordId: employeeId,
        userId: adminId,
        details: auditDetails,
        oldValue: { status: oldEmployee.isActive ? "Active" : "Inactive" },
        newValue: cleanNewValue,
        req: req,
      });

      return { updatedEmployee, auditDetails, cleanNewValue };
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("notification_refresh");

      io.emit("new-audit-log", {
        id: Date.now(),
        action: "UPDATE",
        modelName: "Employee",
        recordId: employeeId,
        performedBy: {
          firstName: adminUser?.firstName || "Unknown",
          lastName: adminUser?.lastName || "",
        },
        details: result.auditDetails,
        newValue: result.cleanNewValue,
        createdAt: new Date(),
      });

      if (!isActive) {
        io.to(`user_${employeeId}`).emit("force_logout", { message: "Account deactivated" });
      }
    }

    res.json({
      message: `Employee status updated to ${result.updatedEmployee.isActive ? "Active" : "Inactive"}`,
      data: result.updatedEmployee,
    });
  } catch (error) {
    console.error("updateEmployeeStatus Error:", error);
    res.status(400).json({ error: error.message || "Cannot update status" });
  }
};

// 4. สร้างพนักงานใหม่พร้อมโควตา
exports.createEmployee = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, department, joiningDate } = req.body; 
    const adminId = req.user.id;

    const adminUser = await prisma.employee.findUnique({
      where: { id: adminId },
      select: { firstName: true, lastName: true },
    });

    const existing = await prisma.employee.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email has been used" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const quotaMap = { Sick: 30, Personal: 6, Annual: 6, Emergency: 5 };
    const currentYear = new Date().getFullYear();

    const assignedRole = normalizeRole(role) || "WORKER";
    const assignedDept = normalizeDepartment(department); 

    const result = await prisma.$transaction(async (tx) => {
      const newEmployee = await tx.employee.create({
        data: {
          firstName,
          lastName,
          email,
          passwordHash: hashedPassword,
          role: assignedRole,
          department: assignedDept, 
          joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
          isActive: true,
        },
      });

      const leaveTypes = await tx.leaveType.findMany();
      let quotaDataForDB = [];
      let quotaSummaryForLog = {};

      if (leaveTypes.length > 0) {
        quotaDataForDB = leaveTypes.map((type) => {
          const days = Number(quotaMap[type.typeName] ?? 0);
          quotaSummaryForLog[type.typeName] = days;
          return {
            employeeId: newEmployee.id,
            leaveTypeId: type.id,
            year: currentYear,
            totalDays: days,
            carryOverDays: 0,
            usedDays: 0,
          };
        });
        await tx.leaveQuota.createMany({ data: quotaDataForDB });
      }

      const cleanNewValue = {
        name: `${firstName} ${lastName}`,
        email: email,
        role: assignedRole,
        department: assignedDept, 
        joiningDate: newEmployee.joiningDate,
        status: "Active",
        initialQuotas: quotaSummaryForLog,
      };

      const logDetails = `Created new employee: ${firstName} ${lastName} (${assignedRole} - ${assignedDept})`;

      await auditLog(tx, {
        action: "CREATE",
        modelName: "Employee",
        recordId: newEmployee.id,
        userId: adminId,
        details: logDetails,
        newValue: cleanNewValue,
        req: req,
      });

      return { newEmployee, logDetails, cleanNewValue };
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("notification_refresh");
      io.emit("new-audit-log", {
        id: Date.now(),
        action: "CREATE",
        modelName: "Employee",
        recordId: result.newEmployee.id,
        performedBy: {
          firstName: adminUser?.firstName || "Unknown",
          lastName: adminUser?.lastName || "",
        },
        details: result.logDetails,
        newValue: result.cleanNewValue,
        createdAt: new Date(),
      });
    }

    res.status(201).json({
      message: "Add employee successful",
      employee: {
        ...result.newEmployee,
        role: presentRole(result.newEmployee.role),
      },
    });
  } catch (error) {
    console.error("createEmployee Error:", error);
    res.status(500).json({ error: error?.message || "Add employee fail" });
  }
};

// 5. getAttendanceStats (เหมือนเดิม)
exports.getAttendanceStats = async (req, res) => {
    // Code เดิม
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
          lateDetails: records
            .filter((r) => r.isLate)
            .map((r) => ({
              name: `${r.employee.firstName} ${r.employee.lastName}`,
              time: formatThaiTime(r.checkInTime),
            })),
        });
      } catch (error) {
        res.status(500).json({ error: "Unable to retrieve statistical data." });
      }
};

// 6. resetPassword (เหมือนเดิม)
exports.resetPassword = async (req, res) => {
    // Code เดิม
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        const requester = req.user;
        const targetId = parseInt(id);
    
        const isOwner = requester.id === targetId;
        const isHR = requester.role === "HR" || requester.role === "Admin";
    
        if (!isHR && !isOwner) {
          return res.status(403).json({ error: "No permission to change this password." });
        }
    
        if (!newPassword || newPassword.length < 6) {
          return res.status(400).json({ error: "Password must be at least 6 characters." });
        }
    
        const requesterUser = await prisma.employee.findUnique({
          where: { id: requester.id },
          select: { firstName: true, lastName: true, role: true },
        });
    
        const hashedPassword = await bcrypt.hash(newPassword, 10);
    
        const result = await prisma.$transaction(async (tx) => {
          const targetUser = await tx.employee.findUnique({
            where: { id: targetId },
            select: { firstName: true, lastName: true, email: true },
          });
    
          if (!targetUser) throw new Error("Employee not found.");
    
          await tx.employee.update({
            where: { id: targetId },
            data: { passwordHash: hashedPassword },
          });
    
          const cleanNewValue = {
            targetName: `${targetUser.firstName} ${targetUser.lastName}`,
            targetEmail: targetUser.email,
            action: "Password Reset",
            resetBy: isOwner ? "Self" : "Admin/HR",
            status: "Success",
          };
    
          const logDetails = isOwner
            ? `User reset their own password.`
            : `HR (${requesterUser.firstName}) reset password for ${targetUser.firstName} ${targetUser.lastName}`;
    
          await auditLog(tx, {
            action: "UPDATE",
            modelName: "Employee",
            recordId: targetId,
            userId: requester.id,
            details: logDetails,
            oldValue: { action: "Password Change Requested" },
            newValue: cleanNewValue,
            req: req,
          });
    
          return { logDetails, targetUser, cleanNewValue };
        });
    
        const io = req.app.get("io");
        if (io) {
          io.emit("new-audit-log", {
            id: Date.now(),
            action: "UPDATE",
            modelName: "Employee",
            recordId: targetId,
            performedBy: {
              firstName: requesterUser?.firstName || "Unknown",
              lastName: requesterUser?.lastName || "",
            },
            details: result.logDetails,
            newValue: result.cleanNewValue,
            createdAt: new Date(),
          });
    
          if (!isOwner) {
            io.to(`user_${targetId}`).emit("force_logout", {
              message: "Your password has been changed by Admin/HR. Please login again.",
            });
          }
        }
    
        res.json({ message: "Password reset successful." });
      } catch (error) {
        console.error("resetPassword Error:", error);
        res.status(400).json({ error: error.message || "Failed to reset password." });
      }
};

// 7. แก้ไขข้อมูลพนักงาน (ชื่อ/อีเมล/role/department)
exports.updateEmployee = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { firstName, lastName, email, role, department } = req.body; // ✅ NEW: รับ department
    const adminId = req.user.id;

    const adminUser = await prisma.employee.findUnique({
      where: { id: adminId },
      select: { firstName: true, lastName: true },
    });

    const dataToUpdate = {};
    if (firstName !== undefined) dataToUpdate.firstName = firstName;
    if (lastName !== undefined) dataToUpdate.lastName = lastName;
    if (email !== undefined) dataToUpdate.email = email;

    if (role !== undefined) {
      const normalized = normalizeRole(role);
      if (!normalized) {
        return res.status(400).json({ error: "Invalid role (allowed: Worker / HR)" });
      }
      dataToUpdate.role = normalized;
    }

    if (department !== undefined) {
      const normalizedDept = normalizeDepartment(department);
      dataToUpdate.department = normalizedDept;
    }

    const result = await prisma.$transaction(async (tx) => {
      const oldEmployee = await tx.employee.findUnique({
        where: { id },
        select: { firstName: true, lastName: true, email: true, role: true, department: true }, 
      });

      if (!oldEmployee) throw { code: "P2025" };

      const updated = await tx.employee.update({
        where: { id },
        data: dataToUpdate,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          department: true, 
          isActive: true,
          joiningDate: true,
        },
      });

      const changes = [];
      if (dataToUpdate.firstName && dataToUpdate.firstName !== oldEmployee.firstName)
        changes.push(`First Name: ${oldEmployee.firstName} -> ${dataToUpdate.firstName}`);

      if (dataToUpdate.lastName && dataToUpdate.lastName !== oldEmployee.lastName)
        changes.push(`Last Name: ${oldEmployee.lastName} -> ${dataToUpdate.lastName}`);

      if (dataToUpdate.email && dataToUpdate.email !== oldEmployee.email)
        changes.push(`Email: ${oldEmployee.email} -> ${dataToUpdate.email}`);

      if (dataToUpdate.role && dataToUpdate.role !== oldEmployee.role)
        changes.push(`Role: ${oldEmployee.role} -> ${dataToUpdate.role}`);

      if (dataToUpdate.department && dataToUpdate.department !== oldEmployee.department)
        changes.push(`Department: ${oldEmployee.department} -> ${dataToUpdate.department}`);

      const auditDetails =
        changes.length > 0
          ? `Updated info for ${oldEmployee.firstName}: ${changes.join(", ")}`
          : `Updated info for ${oldEmployee.firstName} (No changes detected)`;

      const cleanNewValue = {
        name: `${updated.firstName} ${updated.lastName}`,
        email: updated.email,
        role: updated.role,
        department: updated.department, 
        status: updated.isActive ? "Active" : "Inactive",
        changes: changes,
      };

      await auditLog(tx, {
        action: "UPDATE",
        modelName: "Employee",
        recordId: id,
        userId: adminId,
        details: auditDetails,
        oldValue: oldEmployee,
        newValue: cleanNewValue,
        req: req,
      });

      return { updated, auditDetails, cleanNewValue };
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("notification_refresh");
      io.emit("new-audit-log", {
        id: Date.now(),
        action: "UPDATE",
        modelName: "Employee",
        recordId: id,
        performedBy: {
          firstName: adminUser?.firstName || "Unknown",
          lastName: adminUser?.lastName || "",
        },
        details: result.auditDetails,
        newValue: result.cleanNewValue,
        createdAt: new Date(),
      });
    }

    return res.json({
      message: "Employee updated",
      employee: {
        ...result.updated,
        role: presentRole(result.updated.role),
      },
    });
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