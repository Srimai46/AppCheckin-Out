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
        isActive: true,
        joiningDate: true,
        
        // ✅ NEW: ดึงข้อมูลจากตาราง Relation (Role & Department)
        role: {
          select: {
            id: true,
            name: true,
            description: true // เผื่ออยากใช้
          }
        },
        department: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { id: "asc" },
    });

    // ปรับแต่ง Response ให้ Frontend ใช้งานง่าย
    const formattedEmployees = employees.map((e) => ({
      id: e.id,
      firstName: e.firstName,
      lastName: e.lastName,
      email: e.email,
      isActive: e.isActive,
      joiningDate: e.joiningDate,
      
      // ✅ แปลงให้เป็น Flat Format (เหมือนเดิมที่ Frontend เคยใช้)
      role: e.role?.name || "Unknown",
      roleId: e.role?.id, // ส่ง ID ไปด้วยเผื่อใช้ edit
      
      department: e.department?.name || "Unassigned",
      departmentId: e.department?.id // ส่ง ID ไปด้วยเผื่อใช้ edit
    }));

    res.json(formattedEmployees);

  } catch (error) {
    console.error("getAllEmployees Error:", error);
    res.status(500).json({ error: "Failed to retrieve employees" });
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
        // ✅ 1. ดึง Relation Role และ Department เพื่อเอาชื่อ
        role: {
          include: {
            workConfig: true // ✅ ดึง Config เวลาทำงานของ Role นี้มาเลย (สะดวกกว่าไป query แยก)
          }
        },
        department: true,

        // Relation อื่นๆ เหมือนเดิม
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

    // ✅ 2. ดึง Config เวลาจาก Role ที่ include มาได้เลย (ไม่ต้อง Query ใหม่)
    const workCfg = employee.role?.workConfig;

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
        
        // ✅ 3. ปรับการส่ง Role และ Department เป็น String
        role: employee.role?.name || "Unknown", 
        roleId: employee.roleId, // เผื่อ Frontend ใช้
        department: employee.department?.name || "Unassigned",
        departmentId: employee.departmentId, // เผื่อ Frontend ใช้
        
        joiningDate: formatShortDate(employee.joiningDate),
        isActive: employee.isActive,
        profileImageUrl: employee.profileImageUrl // เผื่ออยากโชว์รูป
      },
      
      // ... ส่วน Quotas, Attendance, Leaves ไม่ต้องแก้ (เหมือนเดิม)
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

// 3. เปลี่ยนสถานะพนักงาน 
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
          // ✅ UPDATE 1: ดึง Role Name จาก Relation Table
          role: {
            select: { name: true } 
          },
          isActive: true,
        },
      });

      if (!oldEmployee) {
        throw new Error("Employee not found.");
      }

      const updatedEmployee = await tx.employee.update({
        where: { id: employeeId },
        data: { isActive: !!isActive },
        // ✅ UPDATE 2: Return role name หลัง update ด้วย (เผื่อเอาไปใช้)
        include: {
            role: { select: { name: true } }
        }
      });

      const statusText = !!isActive ? "Active" : "Inactive";
      
      // ✅ UPDATE 3: แปลง Role Object ให้เป็น String สำหรับ Log
      const roleName = oldEmployee.role?.name || "Unknown";

      const cleanNewValue = {
        name: `${oldEmployee.firstName} ${oldEmployee.lastName}`,
        email: oldEmployee.email,
        role: roleName, // เก็บเป็น String สวยๆ
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
      data: {
          ...result.updatedEmployee,
          role: result.updatedEmployee.role?.name // ส่ง role เป็น string กลับไปหน้าบ้าน
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
    const { firstName, lastName, email, password, role, department, joiningDate } = req.body;
    const adminId = req.user.id;

    // 1. ดึงข้อมูล Admin (คนทำรายการ)
    const adminUser = await prisma.employee.findUnique({
      where: { id: adminId },
      select: { firstName: true, lastName: true },
    });

    // 2. เช็ค Email ซ้ำ
    const existing = await prisma.employee.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email has been used" });

    // 3. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);
    const currentYear = new Date().getFullYear();

    // ======================================================
    // ✅ NEW: Logic การหา Role ID และ Department ID
    // ======================================================
    
    // 4.1 หา Role ID (รับมาเป็น ID หรือ Name ก็ได้)
    let targetRoleId;
    if (role) {
       // ลองหาจากชื่อก่อน (เผื่อ Frontend ส่ง string "HR")
       const roleObj = await prisma.role.findFirst({
           where: { name: String(role).toUpperCase().trim() }
       });
       if (roleObj) targetRoleId = roleObj.id;
    }
    
    // ถ้าหาไม่เจอ ให้ Default เป็น "WORKER"
    if (!targetRoleId) {
        const defaultRole = await prisma.role.findFirst({ where: { name: "WORKER" } });
        if (!defaultRole) throw new Error("System error: Default role 'WORKER' not found in DB");
        targetRoleId = defaultRole.id;
    }

    // 4.2 หา Department ID
    let targetDeptId;
    if (department) {
       const deptObj = await prisma.department.findFirst({
           where: { name: String(department).toUpperCase().trim() } // หรือค้นแบบ case-insensitive
       });
       if (deptObj) targetDeptId = deptObj.id;
    }

    // ถ้าหาไม่เจอ ให้ Default เป็น "GENERAL"
    if (!targetDeptId) {
        const defaultDept = await prisma.department.findFirst({ where: { name: "GENERAL" } });
        // ถ้าไม่มี GENERAL ใน DB ก็ปล่อย null หรือ create ใหม่ก็ได้ (ในที่นี้ขอปล่อย null หรือ throw)
        if (defaultDept) targetDeptId = defaultDept.id;
    }

    // ======================================================

    const result = await prisma.$transaction(async (tx) => {
      // ✅ 5. Create Employee (ใช้ connect)
      const newEmployee = await tx.employee.create({
        data: {
          firstName,
          lastName,
          email,
          passwordHash: hashedPassword,
          joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
          isActive: true,
          
          // Connect Role
          role: { connect: { id: targetRoleId } },
          
          // Connect Department (ถ้ามี)
          department: targetDeptId ? { connect: { id: targetDeptId } } : undefined
        },
        // Include กลับมาด้วย เพื่อเอาชื่อไปลง Log
        include: { role: true, department: true } 
      });

      // 6. สร้าง Leave Quota (เหมือนเดิม)
      const quotaMap = { Sick: 30, Personal: 6, Annual: 6, Emergency: 5 };
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

      // ✅ 7. เตรียมข้อมูลสำหรับ Log (ใช้ชื่อจากที่ create ได้)
      const roleName = newEmployee.role?.name;
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
        role: result.newEmployee.role?.name, // ส่ง String กลับไป
        department: result.newEmployee.department?.name
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

        // ✅ 1. นับพนักงานทั้งหมด (เฉพาะ Active)
        // ถ้าต้องการนับเฉพาะ Worker ให้ uncomment บรรทัด where role
        const totalEmployees = await prisma.employee.count({
            where: {
                isActive: true,
                // role: { name: 'WORKER' } // ถ้าอยากนับเฉพาะ Worker ให้เปิดบรรทัดนี้
            }
        });

        // ✅ 2. ดึง Records ประจำวัน
        const records = await prisma.timeRecord.findMany({
            where: { workDate: { gte: startOfDay, lte: endOfDay } },
            include: {
                employee: {
                    select: {
                        firstName: true,
                        lastName: true,
                        // ✅ ดึง Role/Dept มาโชว์ด้วยเผื่อใช้
                        role: { select: { name: true } },
                        department: { select: { name: true } }
                    }
                }
            },
        });

        // ✅ 3. คำนวณสถิติ
        const checkedInCount = records.filter(r => r.checkInTime).length; // นับเฉพาะคนที่มีเวลาเข้างานจริง
        const lateCount = records.filter((r) => r.isLate).length;
        
        // Absent = จำนวนพนักงานทั้งหมด - จำนวนคนที่ Check In แล้ว
        // (ระวัง: ถ้า records มีคน check in ซ้ำ หรือ create record รอไว้แต่ยังไม่ check in ต้องกรองให้ดี)
        const absentCount = Math.max(0, totalEmployees - checkedInCount);

        // ✅ 4. เตรียมข้อมูล Late Details
        const lateDetails = records
            .filter((r) => r.isLate)
            .map((r) => ({
                name: `${r.employee.firstName} ${r.employee.lastName}`,
                role: r.employee.role?.name || "-",
                department: r.employee.department?.name || "-",
                time: formatThaiTime(r.checkInTime),
                note: r.note // เผื่อมีเหตุผลการมาสาย
            }));

        res.json({
            selectedDate: formatShortDate(startOfDay),
            totalEmployees,
            checkedIn: checkedInCount,
            late: lateCount,
            absent: absentCount,
            lateDetails
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
    const requester = req.user; // ข้อมูลจาก JWT
    const targetId = parseInt(id);

    // ✅ STEP 1: ดึงข้อมูลผู้ร้องขอจาก DB ก่อน เพื่อดู Role ปัจจุบันจริงๆ
    const requesterUser = await prisma.employee.findUnique({
      where: { id: requester.id },
      select: { 
          firstName: true, 
          lastName: true, 
          // ดึงชื่อ Role มาด้วย
          role: { select: { name: true } } 
      },
    });

    if (!requesterUser) {
        return res.status(401).json({ error: "User not found." });
    }

    // ✅ STEP 2: ตรวจสอบสิทธิ์จาก Role Name ที่ดึงมา
    const roleName = requesterUser.role?.name?.toUpperCase() || "";
    const isOwner = requester.id === targetId;
    
    // อนุญาตให้ ADMIN หรือ HR แก้ไขได้
    const isAdminOrHR = roleName === "ADMIN" || roleName === "HR";

    if (!isAdminOrHR && !isOwner) {
      return res.status(403).json({ error: "No permission to change this password." });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
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
        resetBy: isOwner ? "Self" : roleName, // ใช้ชื่อ Role จริงๆ
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
    res.status(400).json({ error: error.message || "Failed to reset password." });
  }
};

// 7. แก้ไขข้อมูลพนักงาน (ชื่อ/อีเมล/role/department)
exports.updateEmployee = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { firstName, lastName, email, role, department } = req.body;
    const adminId = req.user.id;

    const adminUser = await prisma.employee.findUnique({
      where: { id: adminId },
      select: { firstName: true, lastName: true },
    });

    // 1. เตรียม Data Object
    const dataToUpdate = {};
    if (firstName !== undefined) dataToUpdate.firstName = firstName;
    if (lastName !== undefined) dataToUpdate.lastName = lastName;
    if (email !== undefined) dataToUpdate.email = email;

    // 2. Logic หา Role ID ถ้ามีการเปลี่ยน Role
    let newRoleName = null; // เก็บไว้ใช้ทำ Log
    if (role !== undefined) {
      // ค้นหา Role ID จากชื่อ (เช่น "HR", "WORKER")
      const roleObj = await prisma.role.findFirst({
        where: { name: String(role).trim().toUpperCase() }
      });
      
      if (!roleObj) {
         return res.status(400).json({ error: `Invalid role: ${role}` });
      }
      
      dataToUpdate.role = { connect: { id: roleObj.id } }; // ✅ Update แบบ Connect Relation
      newRoleName = roleObj.name;
    }

    // 3. Logic หา Department ID ถ้ามีการเปลี่ยน Department
    let newDeptName = null; // เก็บไว้ใช้ทำ Log
    if (department !== undefined) {
       const deptObj = await prisma.department.findFirst({
         where: { name: String(department).trim().toUpperCase() }
       });
       
       // ถ้าหาไม่เจอ ให้เคลียร์เป็น null (Unassigned) หรือจะ throw error ก็ได้
       if (deptObj) {
         dataToUpdate.department = { connect: { id: deptObj.id } };
         newDeptName = deptObj.name;
       } else {
         dataToUpdate.department = { disconnect: true }; // หรือปล่อย null
         newDeptName = "None";
       }
    }

    const result = await prisma.$transaction(async (tx) => {
      // 4. ดึงข้อมูลเก่า (ต้อง Select ชื่อ Role/Dept ออกมา)
      const oldEmployee = await tx.employee.findUnique({
        where: { id },
        select: { 
            firstName: true, lastName: true, email: true, 
            role: { select: { name: true } }, 
            department: { select: { name: true } } 
        },
      });

      if (!oldEmployee) throw { code: "P2025" };
      
      const oldRoleName = oldEmployee.role?.name || "Unknown";
      const oldDeptName = oldEmployee.department?.name || "None";

      // 5. ทำการ Update และ Select ข้อมูลใหม่กลับมา
      const updated = await tx.employee.update({
        where: { id },
        data: dataToUpdate,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: { select: { name: true } }, // ✅ Select ชื่อ Role
          department: { select: { name: true } }, // ✅ Select ชื่อ Dept
          isActive: true,
          joiningDate: true,
        },
      });

      // 6. ตรวจจับความเปลี่ยนแปลง (Audit Log Logic)
      const changes = [];
      if (dataToUpdate.firstName && dataToUpdate.firstName !== oldEmployee.firstName)
        changes.push(`First Name: ${oldEmployee.firstName} -> ${dataToUpdate.firstName}`);

      if (dataToUpdate.lastName && dataToUpdate.lastName !== oldEmployee.lastName)
        changes.push(`Last Name: ${oldEmployee.lastName} -> ${dataToUpdate.lastName}`);

      if (dataToUpdate.email && dataToUpdate.email !== oldEmployee.email)
        changes.push(`Email: ${oldEmployee.email} -> ${dataToUpdate.email}`);

      // เปรียบเทียบ Role (ใช้ชื่อที่เราหามา หรือดึงจาก DB)
      if (newRoleName && newRoleName !== oldRoleName)
        changes.push(`Role: ${oldRoleName} -> ${newRoleName}`);

      // เปรียบเทียบ Department
      if (newDeptName && newDeptName !== oldDeptName)
        changes.push(`Department: ${oldDeptName} -> ${newDeptName}`);

      const auditDetails =
        changes.length > 0
          ? `Updated info for ${oldEmployee.firstName}: ${changes.join(", ")}`
          : `Updated info for ${oldEmployee.firstName} (No changes detected)`;

      const cleanNewValue = {
        name: `${updated.firstName} ${updated.lastName}`,
        email: updated.email,
        role: updated.role?.name,
        department: updated.department?.name,
        status: updated.isActive ? "Active" : "Inactive",
        changes: changes,
      };
      
      // แปลง oldEmployee ให้เป็น flat structure สำหรับ log
      const cleanOldValue = {
          ...oldEmployee,
          role: oldRoleName,
          department: oldDeptName
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
        // แปลง Object ให้เป็น String เพื่อให้ Frontend ใช้ง่าย
        role: result.updated.role?.name,
        department: result.updated.department?.name
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