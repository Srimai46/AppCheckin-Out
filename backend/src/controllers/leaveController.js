// backend/src/controllers/leaveController.js

const prisma = require("../config/prisma");
const { calculateTotalDays } = require("../utils/leaveHelpers");

// =========================================================
// ✅ Constants / Policies
// =========================================================
const ANNUAL_CARRY_CAP = 12; // ทบ Annual ข้ามปี ได้ไม่เกิน 12
const ANNUAL_TOTAL_CAP = 12; // Annual ต่อปี (totalDays) ไม่เกิน 12
const MAX_DAYS_LIMIT = 365;

// =========================================================
// ✅ Helper: normalize quotas input
// =========================================================
const normalizeQuotas = (quotas) => {
  if (!quotas || typeof quotas !== "object") {
    throw new Error(
      "ต้องส่ง quotas เป็น object เช่น { SICK: 30, PERSONAL: 6, ANNUAL: 12, EMERGENCY: 5 }"
    );
  }

  const normalized = {};
  for (const [k, v] of Object.entries(quotas)) {
    const key = String(k).toUpperCase().trim();
    const n = Number(v);

    if (!key) continue;
    if (!Number.isFinite(n) || n < 0 || n > MAX_DAYS_LIMIT) {
      throw new Error(`ค่าโควต้าของ ${key} ต้องเป็นตัวเลข 0-${MAX_DAYS_LIMIT}`);
    }

    // ✅ อนุญาตเป็นจำนวนเต็ม (หากอยากให้รองรับ .5 ให้เปลี่ยน Math.floor เป็น n)
    normalized[key] = Math.floor(n);
  }

  if (Object.keys(normalized).length === 0) {
    throw new Error("quotas ว่างเปล่า");
  }

  // ✅ Hard cap: Annual totalDays ต่อปี ไม่เกิน 12
  if (normalized.ANNUAL != null) {
    normalized.ANNUAL = Math.min(normalized.ANNUAL, ANNUAL_TOTAL_CAP);
  }

  return normalized;
};

// helper: get leaveTypes by typeName (SICK/PERSONAL/ANNUAL/EMERGENCY)
const getLeaveTypesByNames = async (typeNames) => {
  const leaveTypes = await prisma.leaveType.findMany({
    where: { typeName: { in: typeNames } },
    select: { id: true, typeName: true, maxCarryOver: true },
  });

  const found = new Set(leaveTypes.map((t) => t.typeName.toUpperCase()));
  const missing = typeNames.filter((t) => !found.has(t));
  if (missing.length) {
    throw new Error(`ไม่พบ leaveType ในระบบ: ${missing.join(", ")}`);
  }

  return leaveTypes;
};

// helper: Annual cap apply for totalDays and carryOverDays
const capAnnual = ({ typeName, totalDays, carryOverDays }) => {
  const t = String(typeName || "").toUpperCase();

  let nextTotal = totalDays;
  let nextCarry = carryOverDays;

  if (t === "ANNUAL") {
    if (nextTotal != null)
      nextTotal = Math.min(Number(nextTotal) || 0, ANNUAL_TOTAL_CAP);
    if (nextCarry != null)
      nextCarry = Math.min(Number(nextCarry) || 0, ANNUAL_CARRY_CAP);
  }

  return { totalDays: nextTotal, carryOverDays: nextCarry };
};

// ---------------------------------------------------------
// ส่วนของ Worker (พนักงานทั่วไป)
// ---------------------------------------------------------

// 1. ดึงโควตาของตัวเอง
exports.getMyQuotas = async (req, res) => {
  try {
    let year = req.query.year 
      ? parseInt(req.query.year, 10) 
      : new Date().getFullYear();

    // ✅ Normalization: ถ้าส่ง พ.ศ. มา (เช่น 2568) ให้แปลงเป็น ค.ศ. (2025) อัตโนมัติ
    if (year > 2500) {
      year -= 543;
    }

    const quotas = await prisma.leaveQuota.findMany({
      where: { 
        employeeId: req.user.id, 
        year: year 
      },
      include: { leaveType: true },
    });

    // ✅ ตรวจสอบข้อมูลก่อนส่งกลับ
    const result = quotas.map((q) => {
      // ใช้ parseFloat และกำหนด default เป็น 0 เพื่อป้องกัน NaN
      const base = parseFloat(q.totalDays) || 0;
      const carry = parseFloat(q.carryOverDays) || 0;
      const used = parseFloat(q.usedDays) || 0;
      const totalAvailable = base + carry;

      return {
        type: q.leaveType ? q.leaveType.typeName : "Unknown",
        baseQuota: base,
        carryOver: carry,
        total: totalAvailable,
        used: used,
        remaining: totalAvailable - used,
        year: q.year
      };
    });

    // ส่งกลับเป็น Array เสมอ (Empty Array [] หากหาไม่พบ)
    res.json(result);
  } catch (error) {
    console.error("getMyQuotas Error:", error);
    res.status(500).json({ error: "Failed to fetch quota data" });
  }
};

// 2. ดูประวัติการลาของตนเอง
exports.getMyLeaves = async (req, res) => {
  try {
    const leaves = await prisma.leaveRequest.findMany({
      where: { employeeId: req.user.id },
      orderBy: { requestedAt: "desc" },
      include: { leaveType: true },
    });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ error: "ดึงข้อมูลประวัติผิดพลาด" });
  }
};

// 3. ยื่นคำขอลาใหม่ (เพิ่ม validation แน่น)
exports.createLeaveRequest = async (req, res) => {
  try {
    const { type, startDate, endDate, reason, startDuration, endDuration } =
      req.body;
    const userId = req.user.id;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const year = start.getFullYear();

    // ✅ 1. Validate วันที่
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Incorrect date format." });
    }
    if (start > end) {
      return res
        .status(400)
        .json({ error: "The start date must not be longer than the end date." });
    }

    const attachmentUrl = req.file
      ? `/uploads/leaves/${req.file.filename}`
      : null;

    const leaveType = await prisma.leaveType.findUnique({
      where: { typeName: type },
    });
    if (!leaveType)
      return res.status(400).json({ error: "This type of leave was not found." });

    const totalDaysRequested = calculateTotalDays(
      start,
      end,
      startDuration,
      endDuration
    );

    if (totalDaysRequested <= 0) {
      return res.status(400).json({ error: "The number of leave days must be greater than 0" });
    }

    // ✅ 1.5 RULE: ห้ามลาติดต่อกันเกิน maxConsecutiveDays ของประเภทลา
    // เช่น Personal = 3 วัน, Emergency = 2 วัน
    const maxConsecutive = Number(leaveType.maxConsecutiveDays ?? 0);

    // ถ้าใน DB ตั้งไว้ 0 หรือ null ถือว่า "ไม่อนุญาต" / หรือจะตีความเป็น "ไม่จำกัด" ก็ได้
    // ที่นี่เลือกแบบปลอดภัย: ถ้าไม่มีค่า ให้ข้ามกฎนี้ไป
    if (maxConsecutive > 0 && totalDaysRequested > maxConsecutive) {
      return res.status(400).json({
        error: `Cannot take leave of this type. ${leaveType.typeName} consecutively than ${maxConsecutive} Days`,
      });
    }

    // ✅ 2. Transaction การสร้างใบลาและการแจ้งเตือน
    const result = await prisma.$transaction(async (tx) => {
      // ตรวจสอบใบลาทับซ้อน
      const overlap = await tx.leaveRequest.findFirst({
        where: {
          employeeId: userId,
          status: { in: ["Pending", "Approved"] },
          OR: [{ startDate: { lte: end }, endDate: { gte: start } }],
        },
      });
      if (overlap) throw new Error("You already have overlapping leave requests during this period.");

      // ตรวจสอบโควตา
      const quota = await tx.leaveQuota.findUnique({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: userId,
            leaveTypeId: leaveType.id,
            year,
          },
        },
      });

      if (!quota) throw new Error("No vacation days were found for you this year.");

      const remaining =
        Number(quota.totalDays) +
        Number(quota.carryOverDays || 0) -
        Number(quota.usedDays);

      if (remaining < totalDaysRequested) {
        throw new Error(`don't have enough vacation days left. (have ${remaining} days)`);
      }

      // --- สร้างใบลา ---
      const newLeave = await tx.leaveRequest.create({
        data: {
          employeeId: userId,
          leaveTypeId: leaveType.id,
          startDate: start,
          endDate: end,
          totalDaysRequested,
          reason,
          startDuration,
          endDuration,
          status: "Pending",
          attachmentUrl,
        },
        include: { employee: true, leaveType: true },
      });

      const fullName = `${newLeave.employee.firstName} ${newLeave.employee.lastName}`;

      // --- 🔍 ค้นหา HR/Admin ---
      const admins = await tx.employee.findMany({
        where: {
          role: { in: ["HR"] },
          id: { not: userId },
        },
        select: { id: true },
      });

      // --- 📝 บันทึกแจ้งเตือนลง Database ---
      if (admins.length > 0) {
        const notificationMsg = `New leave request: ${fullName} would like to resign.${type} ${totalDaysRequested} days`;

        await tx.notification.createMany({
          data: admins.map((admin) => ({
            employeeId: admin.id,
            notificationType: "NewRequest",
            message: notificationMsg,
            relatedRequestId: newLeave.id,
          })),
        });

        // ดึงข้อมูล Unread Count ล่าสุดของทุกคนเพื่อส่งผ่าน Socket
        const adminUpdates = await Promise.all(
          admins.map(async (admin) => {
            const count = await tx.notification.count({
              where: { employeeId: admin.id, isRead: false },
            });
            return { adminId: admin.id, unreadCount: count };
          })
        );

        return { newLeave, adminUpdates, message: notificationMsg };
      }

      return { newLeave, adminUpdates: [] };
    });

    // ✅ 3. ส่ง Real-time Socket.io ไปหา HR/Admin ทุกคน
    const io = req.app.get("io");
    if (io && result.adminUpdates.length > 0) {
      result.adminUpdates.forEach((update) => {
        io.to(`user_${update.adminId}`).emit("new_notification", {
          id: Date.now(),
          message: result.message,
          notificationType: "NewRequest",
          createdAt: new Date(),
          unreadCount: update.unreadCount,
        });
      });
    }

    res.status(201).json({ message: "Leave request successfully submitted.", data: result.newLeave });
  } catch (error) {
    console.error("Create Leave Request Error:", error);
    res.status(400).json({ error: error.message });
  }
};

// ---------------------------------------------------------
// ส่วนของ HR (จัดการและอนุมัติ)
// ---------------------------------------------------------

// 1. ดึงคำขอลาที่ยังไม่อนุมัติ
exports.getPendingRequests = async (req, res) => {
  try {
    const requests = await prisma.leaveRequest.findMany({
      where: { status: "Pending" },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImageUrl: true,
          },
        },
        leaveType: true,
      },
      orderBy: { requestedAt: "asc" },
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: "Unable to retrieve the item." });
  }
};

// 2. ดึงคำขอลาทั้งหมด
exports.getAllLeaves = async (req, res) => {
  try {
    const leaves = await prisma.leaveRequest.findMany({
      include: {
        employee: { select: { firstName: true, lastName: true, role: true } },
        leaveType: { select: { typeName: true } },
      },
      orderBy: { startDate: "desc" },
    });

    res.json(
      leaves.map((l) => ({
        ...l,
        name: `${l.employee.firstName} ${l.employee.lastName}`,
        type: l.leaveType.typeName,
        totalDays: Number(l.totalDaysRequested),
      }))
    );
  } catch (error) {
    res.status(500).json({ error: "Data retrieval error." });
  }
};

// 3. อนุมัติหรือปฏิเสธคำขอลา
exports.updateLeaveStatus = async (req, res) => {
  try {
    const { id, status, isSpecial } = req.body;
    const hrId = req.user.id;
    const leaveId = parseInt(id);

    if (!leaveId) return res.status(400).json({ error: "ID incorrect" });

    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.leaveRequest.findUnique({
        where: { id: leaveId },
        include: { leaveType: true },
      });

      if (!request || request.status !== "Pending") {
        throw new Error("The leave request is not in a status that can be processed.");
      }

      const updatedRequest = await tx.leaveRequest.update({
        where: { id: leaveId },
        data: {
          status,
          approvedByHrId: hrId,
          approvalDate: new Date(),
          isSpecialApproved: status === "Approved" ? isSpecial || false : false,
        },
      });

      if (status === "Approved" && !isSpecial) {
        await tx.leaveQuota.update({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: request.employeeId,
              leaveTypeId: request.leaveTypeId,
              year: request.startDate.getFullYear(),
            },
          },
          data: { usedDays: { increment: request.totalDaysRequested } },
        });
      }

      let notifyMsg = `Your leave request has been  ${
        status === "Approved" ? "approved" : "refused"
      }`;
      if (status === "Approved" && isSpecial) {
        notifyMsg = `Your leave request has been approved as a special case. (No deduction from leave days.)`;
      }

      const newNotification = await tx.notification.create({
        data: {
          employeeId: request.employeeId,
          notificationType: status === "Approved" ? "Approval" : "Rejection",
          message: notifyMsg,
          relatedRequestId: request.id,
        },
      });

      const unreadCount = await tx.notification.count({
        where: { employeeId: request.employeeId, isRead: false },
      });

      return { updatedRequest, newNotification, unreadCount };
    });

    // Socket.io
    const io = req.app.get("io");
    if (io) {
      io.to(`user_${result.updatedRequest.employeeId}`).emit(
        "new_notification",
        {
          id: result.newNotification.id,
          message: result.newNotification.message,
          type: result.newNotification.notificationType,
          relatedRequestId: result.newNotification.relatedRequestId,
          createdAt: result.newNotification.createdAt,
          unreadCount: result.unreadCount,
        }
      );
    }

    res.json({
      message: `carry out ${status}${
        isSpecial ? " (Special case)" : ""
      } เรียบร้อยแล้ว`,
      data: result.updatedRequest,
      unreadCount: result.unreadCount,
    });
  } catch (error) {
    console.error("Update Leave Status Error:", error);
    res.status(400).json({ error: error.message });
  }
};

// 4. ปรับปรุงโควตาวันลาของพนักงาน (เดิม)
exports.updateEmployeeQuota = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { leaveTypeId, year, totalDays } = req.body;

    const result = await prisma.leaveQuota.upsert({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: parseInt(employeeId),
          leaveTypeId: parseInt(leaveTypeId),
          year: parseInt(year),
        },
      },
      update: { totalDays: parseFloat(totalDays) },
      create: {
        employeeId: parseInt(employeeId),
        leaveTypeId: parseInt(leaveTypeId),
        year: parseInt(year),
        totalDays: parseFloat(totalDays),
        usedDays: 0,
      },
    });

    res.json({ message: "Quota management successful.", data: result });
  } catch (error) {
    res.status(500).json({ error: "fail" });
  }
};

// 5. ✅ ประมวลผลทบวันลาที่เหลือจากปีก่อนหน้า (Annual only, cap 12)
exports.processCarryOver = async (req, res) => {
  try {
    const targetYear = req.body?.targetYear ? parseInt(req.body.targetYear, 10) : null;
    const quotas = req.body?.quotas || {};
    const lastYear = targetYear ? targetYear - 1 : null;
    const ANNUAL_CARRY_CAP = 12;

    if (!targetYear || isNaN(targetYear) || targetYear < 2000) {
      return res.status(400).json({ error: "Invalid targetYear or not provided." });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. ตรวจสอบสถานะการปิดงวด
      const config = await tx.systemConfig.findUnique({
        where: { year: lastYear },
      });

      if (config?.isClosed) {
        throw new Error(`Year ${lastYear} is already closed.`);
      }

      // 2. ดึงข้อมูลโควตาปีที่แล้ว
      const oldQuotas = await tx.leaveQuota.findMany({
        where: { year: lastYear },
        include: { leaveType: true },
      });

      let processedCount = 0;
      const notifications = [];

      for (const quota of oldQuotas) {
        const typeName = String(quota.leaveType?.typeName || "").toUpperCase();

        // --- คำนวณวันทบ (เฉพาะ ANNUAL) ---
       let carryAmount = 0;
        if (typeName === "ANNUAL") {
          const remaining =
            Number(quota.totalDays) +
            Number(quota.carryOverDays) -
            Number(quota.usedDays);
          carryAmount = Math.min(Math.max(remaining, 0), ANNUAL_CARRY_CAP);
        }

        const newBaseQuota = Number(quotas[typeName] || 0);
 
        // --- Upsert เข้าปีใหม่ ---
        await tx.leaveQuota.upsert({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: quota.employeeId,
              leaveTypeId: quota.leaveTypeId,
              year: targetYear,
            },
          },
          update: {
            totalDays: newBaseQuota,
            carryOverDays: carryAmount,
          },
          create: {
            employeeId: quota.employeeId,
            leaveTypeId: quota.leaveTypeId,
            year: targetYear,
            totalDays: newBaseQuota,
            carryOverDays: carryAmount,
            usedDays: 0,
          },
        });

        // ✅ เตรียมข้อมูล Notification (เฉพาะ ANNUAL หรือทุกประเภทตามต้องการ)
        if (typeName === "ANNUAL") {
          notifications.push({
            employeeId: quota.employeeId,
            notificationType: "Approval",
            message: `Your leave carry-over for ${targetYear} has been processed. New balance available!`,
            isRead: false,
          });
        }
        
        processedCount++;
      }

      // 3. บันทึก Notifications ทั้งหมด
      if (notifications.length > 0) {
        await tx.notification.createMany({ data: notifications });
      }

      // 4. ปิดงวดปีที่แล้ว
      await tx.systemConfig.upsert({
        where: { year: lastYear },
        update: { isClosed: true, closedAt: new Date() },
        create: { year: lastYear, isClosed: true, closedAt: new Date() },
      });

      return processedCount;
    });

    // ✅ ส่ง Signal ผ่าน Socket.io เพื่อให้หน้าจอพนักงาน Refresh ข้อมูล
    const io = req.app.get("io");
    if (io) {
      io.emit("notification_refresh"); 
    }

    res.json({
      message: `Processing for ${targetYear} successful. Employees notified.`,
      employeesProcessed: result,
    });
  } catch (error) {
    console.error("processCarryOver error:", error);
    res.status(500).json({ error: error.message });
  }
};

// 6. มอบสิทธิ์วันลาพิเศษให้พนักงาน
exports.grantSpecialLeave = async (req, res) => {
  try {
    const { employeeId, leaveTypeId, amount, reason, year } = req.body;

    await prisma.$transaction(async (tx) => {
      await tx.specialLeaveGrant.create({
        data: {
          employeeId: parseInt(employeeId),
          leaveTypeId: parseInt(leaveTypeId),
          amount: parseFloat(amount),
          reason: reason,
          expiryDate: new Date(`${year}-12-31`),
        },
      });

      await tx.leaveQuota.upsert({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: parseInt(employeeId),
            leaveTypeId: parseInt(leaveTypeId),
            year: parseInt(year),
          },
        },
        update: { totalDays: { increment: parseFloat(amount) } },
        create: {
          employeeId: parseInt(employeeId),
          leaveTypeId: parseInt(leaveTypeId),
          year: parseInt(year),
          totalDays: parseFloat(amount),
          usedDays: 0,
        },
      });
    });

    res.json({ message: "Special leave request successfully granted." });
  } catch (error) {
    res.status(500).json({ error: "fail" });
  }
};

// =========================================================
// ✅ HR: Update quotas by TYPE (Company-wide + Single employee)
// =========================================================

// 7) ✅ HR: ปรับโควต้า "ทั้งบริษัท" แยกประเภท
exports.updateCompanyQuotasByType = async (req, res) => {
  try {
    const { quotas, year, onlyActive } = req.body;

    const normalized = normalizeQuotas(quotas);
    const typeNames = Object.keys(normalized);

    const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
    if (!Number.isFinite(targetYear)) throw new Error("year incorrect");

    const leaveTypes = await getLeaveTypesByNames(typeNames);

    const employees = await prisma.employee.findMany({
      where: onlyActive
        ? { OR: [{ isActive: true }, { isActive: 1 }] }
        : undefined,
      select: { id: true },
    });

    const result = await prisma.$transaction(async (tx) => {
      let updatedCount = 0;

      for (const emp of employees) {
        for (const lt of leaveTypes) {
          const key = lt.typeName.toUpperCase();
          let newTotal = normalized[key];

          // ✅ Annual totalDays cap 12
          ({ totalDays: newTotal } = capAnnual({
            typeName: lt.typeName,
            totalDays: newTotal,
            carryOverDays: undefined,
          }));

          const existing = await tx.leaveQuota.findUnique({
            where: {
              employeeId_leaveTypeId_year: {
                employeeId: emp.id,
                leaveTypeId: lt.id,
                year: targetYear,
              },
            },
            select: { usedDays: true, carryOverDays: true },
          });

          const usedDays = existing ? Number(existing.usedDays || 0) : 0;
          let carryOverDays = existing
            ? Number(existing.carryOverDays || 0)
            : 0;

          // ✅ Annual carryOver cap 12 (กันไว้ด้วย)
          ({ carryOverDays } = capAnnual({
            typeName: lt.typeName,
            totalDays: undefined,
            carryOverDays,
          }));

          const safeTotal = Math.max(newTotal, usedDays);

          await tx.leaveQuota.upsert({
            where: {
              employeeId_leaveTypeId_year: {
                employeeId: emp.id,
                leaveTypeId: lt.id,
                year: targetYear,
              },
            },
            update: { totalDays: safeTotal, carryOverDays },
            create: {
              employeeId: emp.id,
              leaveTypeId: lt.id,
              year: targetYear,
              totalDays: safeTotal,
              carryOverDays,
              usedDays: 0,
            },
          });

          updatedCount++;
        }
      }

      return { updatedCount, employeeCount: employees.length };
    });

    res.json({
      message: "Leave quota update (for the entire company) completed.",
      year: targetYear,
      appliedTypes: typeNames,
      ...result,
    });
  } catch (error) {
    console.error("updateCompanyQuotasByType error:", error);
    res.status(400).json({ error: error.message || "Update failed." });
  }
};

// 8) ✅ HR: ปรับโควต้า "พนักงานคนเดียว" แยกประเภท (หลายประเภทพร้อมกัน)
exports.updateEmployeeQuotasByType = async (req, res) => {
  try {
    const employeeId = parseInt(req.params.employeeId, 10);
    const { quotas, year } = req.body;

    if (!Number.isFinite(employeeId) || employeeId <= 0) {
      throw new Error("employeeId incorrect");
    }

    const normalized = normalizeQuotas(quotas);
    const typeNames = Object.keys(normalized);

    const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
    if (!Number.isFinite(targetYear)) throw new Error("year incorrect");

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true },
    });
    if (!employee) throw new Error("No employee found.");

    const leaveTypes = await getLeaveTypesByNames(typeNames);

    const result = await prisma.$transaction(async (tx) => {
      let updatedCount = 0;

      for (const lt of leaveTypes) {
        const key = lt.typeName.toUpperCase();
        let newTotal = normalized[key];

        // ✅ Annual totalDays cap 12
        ({ totalDays: newTotal } = capAnnual({
          typeName: lt.typeName,
          totalDays: newTotal,
          carryOverDays: undefined,
        }));

        const existing = await tx.leaveQuota.findUnique({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId,
              leaveTypeId: lt.id,
              year: targetYear,
            },
          },
          select: { usedDays: true, carryOverDays: true },
        });

        const usedDays = existing ? Number(existing.usedDays || 0) : 0;
        let carryOverDays = existing ? Number(existing.carryOverDays || 0) : 0;

        // ✅ Annual carryOver cap 12
        ({ carryOverDays } = capAnnual({
          typeName: lt.typeName,
          totalDays: undefined,
          carryOverDays,
        }));

        const safeTotal = Math.max(newTotal, usedDays);

        await tx.leaveQuota.upsert({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId,
              leaveTypeId: lt.id,
              year: targetYear,
            },
          },
          update: { totalDays: safeTotal, carryOverDays },
          create: {
            employeeId,
            leaveTypeId: lt.id,
            year: targetYear,
            totalDays: safeTotal,
            carryOverDays,
            usedDays: 0,
          },
        });

        updatedCount++;
      }

      return { updatedCount };
    });

    res.json({
      message: "Leave quota (per person) updated successfully.",
      employeeId,
      year: targetYear,
      appliedTypes: typeNames,
      ...result,
    });
  } catch (error) {
    console.error("updateEmployeeQuotasByType error:", error);
    res.status(400).json({ error: error.message || "update fail" });
  }
};

// ดึงสถานะการปิดงวดทั้งหมด
exports.getSystemConfigs = async (req, res) => {
  try {
    const configs = await prisma.systemConfig.findMany({
      orderBy: { year: "desc" },
    });
    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ยกเลิกการปิดงวด (Re-open Year)
exports.reopenYear = async (req, res) => {
  try {
    const { year } = req.body;

    await prisma.systemConfig.update({
      where: { year: parseInt(year) },
      data: {
        isClosed: false,
        closedAt: null,
      },
    });

    res.json({ message: `The new year ${year} has officially begun.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
