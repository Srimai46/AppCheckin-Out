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
    const adminId = req.user.id; 
    const employeeId = parseInt(id);

    if (isNaN(employeeId)) {
      return res.status(400).json({ error: "Invalid employee ID" });
    }

    // ✅ 1. หาข้อมูล Admin (เพื่อเอาชื่อไปใส่ Log/Socket)
    const adminUser = await prisma.employee.findUnique({
      where: { id: adminId },
      select: { firstName: true, lastName: true }
    });

    const result = await prisma.$transaction(async (tx) => {
      // 2. ดึงข้อมูลเดิม (ดึง Role/Email มาด้วยเพื่อทำ Log ให้สวย)
      const oldEmployee = await tx.employee.findUnique({
        where: { id: employeeId },
        select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            email: true,      // เพิ่ม
            role: true,       // เพิ่ม
            isActive: true 
        }
      });

      if (!oldEmployee) {
        throw new Error("Employee not found.");
      }

      // 3. อัปเดตสถานะใหม่
      const updatedEmployee = await tx.employee.update({
        where: { id: employeeId },
        data: { isActive: !!isActive },
      });

      // ✅ 4. จัด Format ข้อมูลใหม่ (Clean Data) สำหรับบันทึก Log
      const statusText = !!isActive ? 'Active' : 'Inactive';
      
      const cleanNewValue = {
          name: `${oldEmployee.firstName} ${oldEmployee.lastName}`,
          email: oldEmployee.email,
          role: oldEmployee.role,
          status: statusText, // ค่าใหม่ที่เปลี่ยน
          action: !!isActive ? "Reinstated" : "Terminated" // เพิ่ม context ให้เข้าใจง่าย
      };

      const auditDetails = `Changed status for ${oldEmployee.firstName} ${oldEmployee.lastName} to ${statusText}`;

      // 5. บันทึก Audit Log ลง Database
      await auditLog(tx, {
        action: "UPDATE",
        modelName: "Employee",
        recordId: employeeId,
        userId: adminId,
        details: auditDetails,
        // ส่ง Object เข้าไปตรงๆ (ไม่ต้อง Stringify)
        oldValue: { status: oldEmployee.isActive ? 'Active' : 'Inactive' },
        newValue: cleanNewValue, 
        req: req
      });

      return { updatedEmployee, auditDetails, cleanNewValue };
    });

    // 6. ส่วน Real-time (Socket.io)
    const io = req.app.get("io");
    if (io) {
        // 6.1 สั่งรีเฟรชหน้าจอรายชื่อ
        io.emit("notification_refresh");

        // 6.2 ส่ง Audit Log ไปหน้า System Activities
        io.emit("new-audit-log", {
            id: Date.now(),
            action: "UPDATE", // สีส้ม
            modelName: "Employee",
            recordId: employeeId,
            performedBy: {
                // ✅ ใช้ชื่อจริงจาก DB
                firstName: adminUser?.firstName || "Unknown",
                lastName: adminUser?.lastName || ""
            },
            details: result.auditDetails, 
            newValue: result.cleanNewValue, // ส่งข้อมูลสวยๆ ไปให้ Frontend ดูได้
            createdAt: new Date()
        });

        // (Optional) ถ้าปิดการใช้งานพนักงาน -> เตะออกจากระบบ
        if (!isActive) {
             io.to(`user_${employeeId}`).emit("force_logout", { message: "Account deactivated" });
        }
    }

    res.json({ 
      message: `Employee status updated to ${result.updatedEmployee.isActive ? 'Active' : 'Inactive'}`,
      data: result.updatedEmployee 
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
    const adminId = req.user.id; 

    // 1. หาข้อมูล Admin (เพื่อเอาชื่อไปใส่ Log)
    const adminUser = await prisma.employee.findUnique({
      where: { id: adminId },
      select: { firstName: true, lastName: true }
    });

    const existing = await prisma.employee.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email has been used" });

    const hashedPassword = await bcrypt.hash(password, 10);

    // กำหนดค่าตั้งต้น
    const quotaMap = {
      Sick: 30,
      Personal: 6,
      Annual: 6,
      Emergency: 5,
    };
    const currentYear = new Date().getFullYear();
    const assignedRole = role || "Worker";

    const result = await prisma.$transaction(async (tx) => {
      // 2. สร้างพนักงาน
      const newEmployee = await tx.employee.create({
        data: {
          firstName,
          lastName,
          email,
          passwordHash: hashedPassword,
          role: assignedRole,
          joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
          isActive: true,
        },
      });

      // 3. สร้างโควต้า
      const leaveTypes = await tx.leaveType.findMany();
      
      // ตัวแปรสำหรับเก็บลง Database จริง (มี foreign keys ครบ)
      let quotaDataForDB = [];
      // ตัวแปรสำหรับเก็บลง Log (เก็บแค่ key-value ง่ายๆ)
      let quotaSummaryForLog = {}; 

      if (leaveTypes.length > 0) {
        quotaDataForDB = leaveTypes.map((type) => {
            const days = Number(quotaMap[type.typeName] ?? 0);
            
            // ✅ เก็บข้อมูลสรุปไว้ยัดลง Log (Key: ชื่อประเภทวันลา, Value: จำนวนวัน)
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

      // ✅ 4. จัด Format ข้อมูลใหม่ (Clean Data)
      // สร้าง Object ใหม่สำหรับเก็บลง newValue โดยเฉพาะ ตัดพวก ID และ PasswordHash ทิ้งไป
      const cleanNewValue = {
          name: `${firstName} ${lastName}`,
          email: email,
          role: assignedRole,
          joiningDate: newEmployee.joiningDate,
          status: "Active",
          initialQuotas: quotaSummaryForLog // ผลลัพธ์จะเป็น { Sick: 30, Personal: 6, ... }
      };

      const logDetails = `Created new employee: ${firstName} ${lastName} (${assignedRole})`;

      // 5. บันทึก Audit Log
      await auditLog(tx, {
        action: "CREATE",
        modelName: "Employee",
        recordId: newEmployee.id,
        userId: adminId,
        details: logDetails,
        newValue: cleanNewValue, // 🔥 ใช้ตัวแปรที่จัด Format แล้ว
        req: req
      });

      return { newEmployee, logDetails, cleanNewValue };
    });

    // 6. Real-time Socket
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
                lastName: adminUser?.lastName || ""
            },
            details: result.logDetails,
            // ส่ง newValue ที่สวยงามไปให้ Frontend ดูด้วย (เผื่อกดดูรายละเอียดในอนาคต)
            newValue: result.cleanNewValue, 
            createdAt: new Date()
        });
    }

    res.status(201).json({ message: "Add employee successful", employee: result.newEmployee });
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

    // ✅ 2. หาข้อมูลคนทำรายการ (Requester) เพื่อเอาชื่อไปใส่ Log/Socket
    const requesterUser = await prisma.employee.findUnique({
      where: { id: requester.id },
      select: { firstName: true, lastName: true, role: true }
    });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 🚀 3. ใช้ Transaction
    const result = await prisma.$transaction(async (tx) => {
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

      // ✅ 4. จัด Format ข้อมูลใหม่ (Clean Data) สำหรับบันทึก Log
      const cleanNewValue = {
          targetName: `${targetUser.firstName} ${targetUser.lastName}`,
          targetEmail: targetUser.email,
          action: "Password Reset",
          resetBy: isOwner ? "Self" : "Admin/HR", // บอกว่าใครเปลี่ยน
          status: "Success"
      };

      // สร้างข้อความ Log
      const logDetails = isOwner 
          ? `User reset their own password.` 
          : `HR (${requesterUser.firstName}) reset password for ${targetUser.firstName} ${targetUser.lastName}`;

      // 5. บันทึก Audit Log ลง Database
      await auditLog(tx, {
        action: "UPDATE", 
        modelName: "Employee",
        recordId: targetId,
        userId: requester.id,
        details: logDetails,
        // ส่ง Object เข้าไปตรงๆ (ไม่ต้อง Stringify)
        oldValue: { action: "Password Change Requested" },
        newValue: cleanNewValue, // 🔥 ข้อมูลสวยงาม
        req: req
      });

      return { logDetails, targetUser, cleanNewValue };
    });

    // 6. ส่วน Real-time (Socket.io)
    const io = req.app.get("io");
    if (io) {
        // 6.1 ส่ง Audit Log ไปแสดงบนหน้าจอ System Activities
        io.emit("new-audit-log", {
            id: Date.now(),
            action: "UPDATE", // สีส้ม
            modelName: "Employee", // หรือ "Security"
            recordId: targetId,
            performedBy: {
                // ✅ ใช้ชื่อจริงจาก DB
                firstName: requesterUser?.firstName || "Unknown",
                lastName: requesterUser?.lastName || ""
            },
            details: result.logDetails,
            newValue: result.cleanNewValue, // ส่งข้อมูลสวยๆ ไปให้ดู
            createdAt: new Date()
        });

        // 6.2 (Optional) ถ้า HR เป็นคนเปลี่ยน -> สั่ง Logout เครื่องเป้าหมาย
        if (!isOwner) {
            io.to(`user_${targetId}`).emit("force_logout", { 
                message: "Your password has been changed by Admin/HR. Please login again." 
            });
        }
    }

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
    const adminId = req.user.id;

    // ✅ 1. หาข้อมูล Admin (เพื่อเอาชื่อไปใส่ Socket/Log)
    const adminUser = await prisma.employee.findUnique({
      where: { id: adminId },
      select: { firstName: true, lastName: true }
    });

    // Validation ส่วน Role
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

    const result = await prisma.$transaction(async (tx) => {
      const oldEmployee = await tx.employee.findUnique({
        where: { id },
        select: { firstName: true, lastName: true, email: true, role: true }
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
          isActive: true,
          joiningDate: true,
        },
      });

      // 🔥 สร้างข้อความ Log (เพิ่มเช็ค Email ด้วย)
      const changes = [];
      if (dataToUpdate.firstName && dataToUpdate.firstName !== oldEmployee.firstName) 
        changes.push(`First Name: ${oldEmployee.firstName} -> ${dataToUpdate.firstName}`);
      
      if (dataToUpdate.lastName && dataToUpdate.lastName !== oldEmployee.lastName) 
        changes.push(`Last Name: ${oldEmployee.lastName} -> ${dataToUpdate.lastName}`);

      if (dataToUpdate.email && dataToUpdate.email !== oldEmployee.email) 
        changes.push(`Email: ${oldEmployee.email} -> ${dataToUpdate.email}`); 

      if (dataToUpdate.role && dataToUpdate.role !== oldEmployee.role) 
        changes.push(`Role: ${oldEmployee.role} -> ${dataToUpdate.role}`);

      const auditDetails = changes.length > 0 
        ? `Updated info for ${oldEmployee.firstName}: ${changes.join(", ")}`
        : `Updated info for ${oldEmployee.firstName} (No changes detected)`;

      // ✅ จัด Format ข้อมูลใหม่ (Clean Data)
      const cleanNewValue = {
          name: `${updated.firstName} ${updated.lastName}`,
          email: updated.email,
          role: updated.role,
          status: updated.isActive ? "Active" : "Inactive",
          changes: changes // ใส่รายการที่เปลี่ยนเข้าไปใน Json ด้วยเลยเพื่อความชัดเจน
      };

      await auditLog(tx, {
        action: "UPDATE",
        modelName: "Employee",
        recordId: id,
        userId: adminId,
        details: auditDetails,
        oldValue: oldEmployee, 
        newValue: cleanNewValue, 
        req: req
      });

      return { updated, auditDetails, cleanNewValue };
    });

    // Socket Emit
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
                lastName: adminUser?.lastName || ""
            },
            details: result.auditDetails,
            newValue: result.cleanNewValue, // ส่งข้อมูลสวยๆ ไปให้ Frontend
            createdAt: new Date()
        });
    }

    return res.json({ message: "Employee updated", employee: result.updated });

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
