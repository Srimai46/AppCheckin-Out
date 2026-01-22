// controllers/employeeController.js
const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");
const { auditLog } = require("../utils/logger");

// --- Helper Functions (Date/Time Formatter) ---
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

/**
 * ✅ Normalize + resolve helpers (รองรับทั้ง id number, id เป็น string "3", หรือ name "GENERAL")
 * FE แนะนำส่ง roleId / departmentId จะชัวร์ที่สุด แต่ยังรองรับ role/department แบบ name ตามเดิม
 */
const toIntOrNull = (v) => {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
};

const normalizeName = (v) => String(v ?? "").trim().toUpperCase();

const resolveRoleId = async (prismaOrTx, roleLike) => {
  const id = toIntOrNull(roleLike);
  if (id) {
    const r = await prismaOrTx.role.findUnique({ where: { id } });
    return r?.id || null;
  }

  const name = normalizeName(roleLike);
  if (!name) return null;

  const r = await prismaOrTx.role.findFirst({ where: { name } });
  return r?.id || null;
};

const resolveDepartmentId = async (prismaOrTx, deptLike) => {
  const id = toIntOrNull(deptLike);
  if (id) {
    const d = await prismaOrTx.department.findUnique({ where: { id } });
    return d?.id || null;
  }

  const name = normalizeName(deptLike);
  if (!name) return null;

  const d = await prismaOrTx.department.findFirst({ where: { name } });
  return d?.id || null;
};

const isClearValue = (v) =>
  v === null || v === undefined || (typeof v === "string" && v.trim() === "");

// ==============================
// Controllers
// ==============================

// 1. ดึงรายชื่อพนักงานทุกคน
exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
        joiningDate: true,
        role: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { id: "asc" },
    });

    const formattedEmployees = employees.map((e) => ({
      id: e.id,
      firstName: e.firstName,
      lastName: e.lastName,
      email: e.email,
      isActive: e.isActive,
      joiningDate: e.joiningDate,
      role: e.role?.name || "Unknown",
      roleId: e.role?.id,
      department: e.department?.name || "Unassigned",
      departmentId: e.department?.id,
    }));

    res.json(formattedEmployees);
  } catch (error) {
    console.error("getAllEmployees Error:", error);
    res.status(500).json({ error: "Failed to retrieve employees" });
  }
};

// 2. ดึงรายละเอียดพนักงานรายคน
exports.getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    let year = req.query.year
      ? parseInt(req.query.year, 10)
      : new Date().getFullYear();
    if (year > 2500) year -= 543;

    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(id) },
      include: {
        role: { include: { workConfig: true } },
        department: true,
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

    const workCfg = employee.role?.workConfig;
    const workEndTime =
      workCfg &&
      Number.isFinite(workCfg.endHour) &&
      Number.isFinite(workCfg.endMin)
        ? `${String(workCfg.endHour).padStart(2, "0")}:${String(
            workCfg.endMin
          ).padStart(2, "0")}`
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
        role: employee.role?.name || "Unknown",
        roleId: employee.roleId,
        department: employee.department?.name || "Unassigned",
        departmentId: employee.departmentId,
        joiningDate: formatShortDate(employee.joiningDate),
        isActive: employee.isActive,
        profileImageUrl: employee.profileImageUrl,
      },
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
        const isEarly =
          endMin != null && outMin != null ? outMin < endMin : false;

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
          checkInTimeDisplay: record.checkInTime
            ? formatThaiTime(record.checkInTime)
            : "-",
          checkOutTimeDisplay: record.checkOutTime
            ? formatThaiTime(record.checkOutTime)
            : "-",
          isLate: !!record.isLate,
          note: record.note || "-",
          checkInStatus: record.checkInTime
            ? record.isLate
              ? "LATE"
              : "ON_TIME"
            : "ABSENT",
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

// 3. เปลี่ยนสถานะพนักงาน
exports.updateEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const adminId = req.user.id;
    const employeeId = parseInt(id);

    if (isNaN(employeeId))
      return res.status(400).json({ error: "Invalid employee ID" });

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
          role: { select: { name: true } },
          isActive: true,
        },
      });

      if (!oldEmployee) throw new Error("Employee not found.");

      const updatedEmployee = await tx.employee.update({
        where: { id: employeeId },
        data: { isActive: !!isActive },
        include: { role: { select: { name: true } } },
      });

      const statusText = !!isActive ? "Active" : "Inactive";
      const roleName = oldEmployee.role?.name || "Unknown";

      const cleanNewValue = {
        name: `${oldEmployee.firstName} ${oldEmployee.lastName}`,
        email: oldEmployee.email,
        role: roleName,
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
        io.to(`user_${employeeId}`).emit("force_logout", {
          message: "Account deactivated",
        });
      }
    }

    res.json({
      message: `Employee status updated to ${
        result.updatedEmployee.isActive ? "Active" : "Inactive"
      }`,
      data: {
        ...result.updatedEmployee,
        role: result.updatedEmployee.role?.name,
      },
    });
  } catch (error) {
    console.error("updateEmployeeStatus Error:", error);
    res.status(400).json({ error: error.message || "Cannot update status" });
  }
};

// 4. สร้างพนักงานใหม่พร้อมโควตา
exports.createEmployee = async (req, res) => {
  try {
    // ✅ รองรับ roleId/departmentId ด้วย (เผื่อ FE ส่ง id มา)
    const {
      firstName,
      lastName,
      email,
      password,
      role,
      roleId,
      department,
      departmentId,
      joiningDate,
    } = req.body;

    const adminId = req.user.id;

    const adminUser = await prisma.employee.findUnique({
      where: { id: adminId },
      select: { firstName: true, lastName: true },
    });

    const existing = await prisma.employee.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email has been used" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const currentYear = new Date().getFullYear();

    // ✅ Resolve Role (prefer roleId)
    let targetRoleId = await resolveRoleId(prisma, roleId ?? role);

    // Default Role = WORKER
    if (!targetRoleId) {
      const defaultRole = await prisma.role.findFirst({
        where: { name: "WORKER" },
      });
      if (!defaultRole)
        throw new Error("System error: Default role 'WORKER' not found");
      targetRoleId = defaultRole.id;
    }

    // ✅ Resolve Department (prefer departmentId)
    let targetDeptId = await resolveDepartmentId(prisma, departmentId ?? department);

    // Default Department = GENERAL (ถ้าไม่มีใน DB จะปล่อย null)
    if (!targetDeptId) {
      const defaultDept = await prisma.department.findFirst({
        where: { name: "GENERAL" },
      });
      targetDeptId = defaultDept?.id || null;
    }

    const result = await prisma.$transaction(async (tx) => {
      const newEmployee = await tx.employee.create({
        data: {
          firstName,
          lastName,
          email,
          passwordHash: hashedPassword,
          joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
          isActive: true,
          role: { connect: { id: targetRoleId } },
          department: targetDeptId ? { connect: { id: targetDeptId } } : undefined,
        },
        include: { role: true, department: true },
      });

      // Create Quotas
      const quotaMap = { Sick: 30, Personal: 6, Annual: 6, Emergency: 5 };
      const leaveTypes = await tx.leaveType.findMany();

      let quotaSummaryForLog = {};
      if (leaveTypes.length > 0) {
        const quotaDataForDB = leaveTypes.map((type) => {
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

      const roleName = newEmployee.role?.name || "Unknown";
      const deptName = newEmployee.department?.name || "None";

      const cleanNewValue = {
        name: `${firstName} ${lastName}`,
        email: email,
        role: roleName,
        department: deptName,
        joiningDate: newEmployee.joiningDate,
        status: "Active",
        initialQuotas: quotaSummaryForLog,
      };

      const logDetails = `Created new employee: ${firstName} ${lastName} (${roleName} - ${deptName})`;

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
        id: result.newEmployee.id,
        firstName: result.newEmployee.firstName,
        lastName: result.newEmployee.lastName,
        email: result.newEmployee.email,
        role: result.newEmployee.role?.name,
        department: result.newEmployee.department?.name,
      },
    });
  } catch (error) {
    console.error("createEmployee Error:", error);
    res.status(500).json({ error: error?.message || "Add employee fail" });
  }
};

// 5. getAttendanceStats
exports.getAttendanceStats = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const totalEmployees = await prisma.employee.count({
      where: { isActive: true },
    });

    const records = await prisma.timeRecord.findMany({
      where: { workDate: { gte: startOfDay, lte: endOfDay } },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            role: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
      },
    });

    const checkedInCount = records.filter((r) => r.checkInTime).length;
    const lateCount = records.filter((r) => r.isLate).length;
    const absentCount = Math.max(0, totalEmployees - checkedInCount);

    const lateDetails = records
      .filter((r) => r.isLate)
      .map((r) => ({
        name: `${r.employee.firstName} ${r.employee.lastName}`,
        role: r.employee.role?.name || "-",
        department: r.employee.department?.name || "-",
        time: formatThaiTime(r.checkInTime),
        note: r.note,
      }));

    res.json({
      selectedDate: formatShortDate(startOfDay),
      totalEmployees,
      checkedIn: checkedInCount,
      late: lateCount,
      absent: absentCount,
      lateDetails,
    });
  } catch (error) {
    console.error("getAttendanceStats Error:", error);
    res.status(500).json({ error: "Unable to retrieve statistical data." });
  }
};

// 6. resetPassword (เหมือนเดิม)
exports.resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const requester = req.user;
    const targetId = parseInt(id);

    const requesterUser = await prisma.employee.findUnique({
      where: { id: requester.id },
      select: {
        firstName: true,
        lastName: true,
        role: { select: { name: true } },
      },
    });

    if (!requesterUser) return res.status(401).json({ error: "User not found." });

    const roleName = requesterUser.role?.name?.toUpperCase() || "";
    const isOwner = requester.id === targetId;
    const isAdminOrHR = roleName === "ADMIN" || roleName === "HR";

    if (!isAdminOrHR && !isOwner) {
      return res
        .status(403)
        .json({ error: "No permission to change this password." });
    }

    if (!newPassword || newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters." });
    }

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
        resetBy: isOwner ? "Self" : roleName,
        status: "Success",
      };

      const logDetails = isOwner
        ? `User reset their own password.`
        : `${roleName} (${requesterUser.firstName}) reset password for ${targetUser.firstName} ${targetUser.lastName}`;

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
    res
      .status(400)
      .json({ error: error.message || "Failed to reset password." });
  }
};

// 7. แก้ไขข้อมูลพนักงาน
exports.updateEmployee = async (req, res) => {
  try {
    const id = Number(req.params.id);

    // ✅ รองรับ roleId/departmentId ด้วย
    const { firstName, lastName, email, role, roleId, department, departmentId } =
      req.body;

    const adminId = req.user.id;

    const adminUser = await prisma.employee.findUnique({
      where: { id: adminId },
      select: { firstName: true, lastName: true },
    });

    const dataToUpdate = {};
    if (firstName !== undefined) dataToUpdate.firstName = firstName;
    if (lastName !== undefined) dataToUpdate.lastName = lastName;
    if (email !== undefined) dataToUpdate.email = email;

    // --- Logic หา Role ---
    let newRoleName = null;
    if (role !== undefined || roleId !== undefined) {
      const resolvedRoleId = await resolveRoleId(prisma, roleId ?? role);
      if (!resolvedRoleId) {
        return res.status(400).json({
          error: `Invalid role: ${roleId ?? role}`,
        });
      }
      const roleObj = await prisma.role.findUnique({
        where: { id: resolvedRoleId },
      });
      newRoleName = roleObj?.name || null;

      dataToUpdate.role = { connect: { id: resolvedRoleId } };
    }

    // --- Logic หา Department ---
    let newDeptName = null;
    if (department !== undefined || departmentId !== undefined) {
      const input = departmentId ?? department;

      // ถ้าส่ง null/"" = ตั้งใจล้างแผนก
      if (isClearValue(input)) {
        dataToUpdate.department = { disconnect: true };
        newDeptName = "None";
      } else {
        const resolvedDeptId = await resolveDepartmentId(prisma, input);
        if (!resolvedDeptId) {
          // ✅ โหมดเข้ม: ถ้าหาไม่เจอให้ error (อิง table จริง)
          return res.status(400).json({
            error: `Invalid department: ${input}`,
          });
        }
        const deptObj = await prisma.department.findUnique({
          where: { id: resolvedDeptId },
        });
        newDeptName = deptObj?.name || null;

        dataToUpdate.department = { connect: { id: resolvedDeptId } };
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const oldEmployee = await tx.employee.findUnique({
        where: { id },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          role: { select: { name: true } },
          department: { select: { name: true } },
        },
      });

      if (!oldEmployee) throw { code: "P2025" };

      const oldRoleName = oldEmployee.role?.name || "Unknown";
      const oldDeptName = oldEmployee.department?.name || "None";

      const updated = await tx.employee.update({
        where: { id },
        data: dataToUpdate,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: { select: { name: true } },
          department: { select: { name: true } },
          isActive: true,
          joiningDate: true,
        },
      });

      const changes = [];
      if (
        dataToUpdate.firstName !== undefined &&
        dataToUpdate.firstName !== oldEmployee.firstName
      )
        changes.push(`First Name: ${oldEmployee.firstName} -> ${dataToUpdate.firstName}`);

      if (
        dataToUpdate.lastName !== undefined &&
        dataToUpdate.lastName !== oldEmployee.lastName
      )
        changes.push(`Last Name: ${oldEmployee.lastName} -> ${dataToUpdate.lastName}`);

      if (
        dataToUpdate.email !== undefined &&
        dataToUpdate.email !== oldEmployee.email
      )
        changes.push(`Email: ${oldEmployee.email} -> ${dataToUpdate.email}`);

      if (newRoleName && newRoleName !== oldRoleName)
        changes.push(`Role: ${oldRoleName} -> ${newRoleName}`);

      // newDeptName อาจเป็น "None"
      if (newDeptName !== null && newDeptName !== oldDeptName)
        changes.push(`Department: ${oldDeptName} -> ${newDeptName}`);

      const auditDetails =
        changes.length > 0
          ? `Updated info for ${oldEmployee.firstName}: ${changes.join(", ")}`
          : `Updated info for ${oldEmployee.firstName} (No changes detected)`;

      const cleanNewValue = {
        name: `${updated.firstName} ${updated.lastName}`,
        email: updated.email,
        role: updated.role?.name,
        department: updated.department?.name || "None",
        status: updated.isActive ? "Active" : "Inactive",
        changes: changes,
      };

      const cleanOldValue = {
        name: `${oldEmployee.firstName} ${oldEmployee.lastName}`,
        email: oldEmployee.email,
        role: oldRoleName,
        department: oldDeptName,
      };

      await auditLog(tx, {
        action: "UPDATE",
        modelName: "Employee",
        recordId: id,
        userId: adminId,
        details: auditDetails,
        oldValue: cleanOldValue,
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
        role: result.updated.role?.name,
        department: result.updated.department?.name,
      },
    });
  } catch (err) {
    console.error("UpdateEmployee Error:", err);
    if (err.code === "P2002") {
      return res.status(400).json({
        error: "This email address is already in use.",
      });
    }
    if (err.code === "P2025" || err.status === 404) {
      return res.status(404).json({
        error: "No employees requiring update were found.",
      });
    }
    return res.status(500).json({ error: "Update employee failed" });
  }
};

// 8) ดึงรายการ Departments (สำหรับ dropdown)
exports.getDepartments = async (req, res) => {
  try {
    const items = await prisma.department.findMany({
      select: { id: true, name: true, description: true },
      orderBy: { name: "asc" },
    });
    res.json(items);
  } catch (error) {
    console.error("getDepartments Error:", error);
    res.status(500).json({ error: "Failed to retrieve departments" });
  }
};

// 9) ดึงรายการ Roles (สำหรับ dropdown)
exports.getRoles = async (req, res) => {
  try {
    const items = await prisma.role.findMany({
      select: { id: true, name: true, description: true },
      orderBy: { name: "asc" },
    });
    res.json(items);
  } catch (error) {
    console.error("getRoles Error:", error);
    res.status(500).json({ error: "Failed to retrieve roles" });
  }
};
