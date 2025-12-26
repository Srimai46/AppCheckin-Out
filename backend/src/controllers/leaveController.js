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
// quotas: { SICK: 30, PERSONAL: 6, ANNUAL: 12, EMERGENCY: 5 }
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
        year: year,
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
        year: q.year,
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

    const config = await prisma.systemConfig.findUnique({
      where: { year: year },
    });

    // ตรวจสอบสถานะการปิดงวด
    if (config?.isClosed) {
      return res.status(403).json({
        error: `Sorry, the leave request system for ${year} is currently locked due to year-end processing.`,
      });
    }

    // ✅ 1. Validate วันที่
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Incorrect date format." });
    }
    if (start > end) {
      return res.status(400).json({
        error: "The start date must not be longer than the end date.",
      });
    }

    const attachmentUrl = req.file
      ? `/uploads/leaves/${req.file.filename}`
      : null;

    const leaveType = await prisma.leaveType.findUnique({
      where: { typeName: type },
    });
    if (!leaveType)
      return res
        .status(400)
        .json({ error: "This type of leave was not found." });

    const totalDaysRequested = calculateTotalDays(
      start,
      end,
      startDuration,
      endDuration
    );

    if (totalDaysRequested <= 0) {
      return res
        .status(400)
        .json({ error: "The number of leave days must be greater than 0" });
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
      if (overlap)
        throw new Error(
          "You already have overlapping leave requests during this period."
        );

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

      if (!quota)
        throw new Error("No vacation days were found for you this year.");

      const remaining =
        Number(quota.totalDays) +
        Number(quota.carryOverDays || 0) -
        Number(quota.usedDays);

      if (remaining < totalDaysRequested) {
        throw new Error(
          `don't have enough vacation days left. (have ${remaining} days)`
        );
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

    res.status(201).json({
      message: "Leave request successfully submitted.",
      data: result.newLeave,
    });
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
        throw new Error(
          "The leave request is not in a status that can be processed."
        );
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

// 4. ✅ HR: ประมวลผลทบวันลาข้ามปี (Custom Logic)
exports.processCarryOver = async (req, res) => {
  try {
    const { 
      targetYear, 
      quotas = {}, 
      carryConfigs = {} // เพิ่มการรับค่า config การทบวัน
    } = req.body;

    /* ตัวอย่าง carryConfigs ที่ส่งมา:
      {
        "ANNUAL": { maxCarry: 5, totalCap: 15 }, 
        "SICK": { maxCarry: 0, totalCap: 30 }
      }
    */

    const lastYear = targetYear ? parseInt(targetYear, 10) - 1 : null;

    if (!targetYear || isNaN(targetYear)) {
      throw new Error("Invalid targetYear.");
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. ตรวจสอบการปิดงวด
      const config = await tx.systemConfig.findUnique({ where: { year: lastYear } });
      if (config?.isClosed) throw new Error(`Year ${lastYear} is already closed.`);

      // 2. ดึงข้อมูลพื้นฐาน
      const allEmployees = await tx.employee.findMany({ where: { isActive: true } });
      const leaveTypes = await tx.leaveType.findMany();

      let processedCount = 0;
      const notifications = [];

      for (const emp of allEmployees) {
        for (const type of leaveTypes) {
          const typeName = type.typeName.toUpperCase();
          const setting = carryConfigs[typeName] || { maxCarry: 0, totalCap: 999 };
          
          let carryAmount = 0;
          let newBaseQuota = Number(quotas[typeName] || 0);

          // 3. ดึงข้อมูลปีเก่า
          const oldQuota = await tx.leaveQuota.findUnique({
            where: {
              employeeId_leaveTypeId_year: {
                employeeId: emp.id,
                leaveTypeId: type.id,
                year: lastYear,
              },
            },
          });

          // 4. Logic การทบวันแบบ Custom
          if (oldQuota && setting.maxCarry > 0) {
            const remaining = Number(oldQuota.totalDays) + Number(oldQuota.carryOverDays) - Number(oldQuota.usedDays);
            const actualRemaining = Math.max(remaining, 0);

            // คำนวณวันทบโดยอิงจาก maxCarry ที่ HR กำหนด
            carryAmount = Math.min(actualRemaining, setting.maxCarry);

            // ตรวจสอบเพดานรวม (Base + Carry) ไม่ให้เกิน totalCap ที่ HR กำหนด
            if (newBaseQuota + carryAmount > setting.totalCap) {
              carryAmount = Math.max(setting.totalCap - newBaseQuota, 0);
            }
          }

          // 5. Upsert ข้อมูล
          await tx.leaveQuota.upsert({
            where: {
              employeeId_leaveTypeId_year: {
                employeeId: emp.id,
                leaveTypeId: type.id,
                year: parseInt(targetYear, 10),
              },
            },
            update: { totalDays: newBaseQuota, carryOverDays: carryAmount },
            create: {
              employeeId: emp.id,
              leaveTypeId: type.id,
              year: parseInt(targetYear, 10),
              totalDays: newBaseQuota,
              carryOverDays: carryAmount,
              usedDays: 0,
            },
          });
        }

        notifications.push({
          employeeId: emp.id,
          notificationType: "Approval",
          message: `Your leave quotas for ${targetYear} have been processed.`,
          isRead: false,
        });
        processedCount++;
      }

      // 6. บันทึกแจ้งเตือนและปิดปี
      if (notifications.length > 0) await tx.notification.createMany({ data: notifications });
      await tx.systemConfig.upsert({
        where: { year: lastYear },
        update: { isClosed: true, closedAt: new Date() },
        create: { year: lastYear, isClosed: true, closedAt: new Date() },
      });

      return processedCount;
    });

    const io = req.app.get("io");
    if (io) io.emit("notification_refresh");

    res.json({ message: "Success", employeesProcessed: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 5. ✅ HR: อนุมัติกรณีพิเศษ (ไม่หักโควต้า)
exports.grantSpecialLeave = async (req, res) => {
  try {
    const { employeeId, amount, reason, year, leaveRequestId } = req.body;

    const specialType = await prisma.leaveType.findFirst({
      where: { typeName: "Special" },
    });

    if (!specialType) {
      return res
        .status(400)
        .json({ error: "System Error: 'Special' leave type not found." });
    }

    await prisma.$transaction(async (tx) => {
      // 1. สร้าง Grant Record
      const grant = await tx.specialLeaveGrant.create({
        data: {
          employeeId: parseInt(employeeId),
          leaveTypeId: specialType.id,
          amount: parseFloat(amount),
          reason: reason || "Special Approval",
          expiryDate: new Date(`${year}-12-31`),
        },
      });

      // 2. จัดการ Quota หมวด Special
      await tx.leaveQuota.upsert({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: parseInt(employeeId),
            leaveTypeId: specialType.id,
            year: parseInt(year),
          },
        },
        update: {
          totalDays: { increment: parseFloat(amount) },
          usedDays: { increment: parseFloat(amount) },
        },
        create: {
          employeeId: parseInt(employeeId),
          leaveTypeId: specialType.id,
          year: parseInt(year),
          totalDays: parseFloat(amount),
          usedDays: parseFloat(amount),
        },
      });

      // 3. ✅ อัปเดตใบลา (แก้ไขจุดที่เกิด Error)
      if (leaveRequestId) {
        await tx.leaveRequest.update({
          where: { id: parseInt(leaveRequestId) },
          data: {
            status: "Approved",
            isSpecialApproved: true,

            leaveType: {
              connect: { id: specialType.id },
            },

            specialGrant: {
              connect: { id: grant.id },
            },
            
            approvedByHr: {
              connect: { id: req.user.id },
            },

            approvalDate: new Date(),
          },
        });
      }
    });

    const io = req.app.get("io");
    if (io) io.emit("notification_refresh");

    res.json({ message: "Special Case processed successfully." });
  } catch (error) {
    console.error("grantSpecialLeave Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// =========================================================
// ✅ HR: Update quotas by TYPE (Company-wide + Single employee)
// =========================================================

// 6. ✅ HR: ปรับโควต้า "ทั้งบริษัท" แยกประเภท (หลายประเภทพร้อมกัน)
exports.updateCompanyQuotasByType = async (req, res) => {
  try {
    const { quotas, year, onlyActive, configs = {} } = req.body; 
    // configs เช่น { "ANNUAL": { totalCap: 15 } }

    const normalized = normalizeQuotas(quotas);
    const typeNames = Object.keys(normalized);
    const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();

    const leaveTypes = await getLeaveTypesByNames(typeNames);
    const employees = await prisma.employee.findMany({
      where: onlyActive ? { OR: [{ isActive: true }, { isActive: 1 }] } : undefined,
      select: { id: true },
    });

    const result = await prisma.$transaction(async (tx) => {
      let updatedCount = 0;

      for (const emp of employees) {
        for (const lt of leaveTypes) {
          const typeName = lt.typeName.toUpperCase();
          const setting = configs[typeName] || { totalCap: 999 };
          let newBase = Number(normalized[typeName] || 0);

          // 1. ดึงข้อมูลปัจจุบัน (ต้องดูทั้ง Used และ Carry)
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

          const currentUsed = existing ? Number(existing.usedDays || 0) : 0;
          const currentCarry = existing ? Number(existing.carryOverDays || 0) : 0;

          // 2. Logic: โควต้าใหม่ + วันทบเดิม ต้องไม่เกินเพดานที่ HR กำหนด
          // และต้องไม่น้อยกว่าวันที่ใช้ไปแล้ว
          let safeBase = newBase;
          if (safeBase + currentCarry > setting.totalCap) {
             safeBase = Math.max(setting.totalCap - currentCarry, 0);
          }
          
          // ป้องกันการปรับลดจนโควต้ารวม (Base + Carry) น้อยกว่าที่ใช้ไปจริง
          if (safeBase + currentCarry < currentUsed) {
             safeBase = Math.max(currentUsed - currentCarry, 0);
          }

          await tx.leaveQuota.upsert({
            where: {
              employeeId_leaveTypeId_year: {
                employeeId: emp.id,
                leaveTypeId: lt.id,
                year: targetYear,
              },
            },
            update: { totalDays: safeBase }, // อัปเดตแค่ฐานโควต้า
            create: {
              employeeId: emp.id,
              leaveTypeId: lt.id,
              year: targetYear,
              totalDays: safeBase,
              carryOverDays: 0,
              usedDays: 0,
            },
          });
          updatedCount++;
        }
      }
      return { updatedCount, employeeCount: employees.length };
    });

    res.json({ message: "Updated with Custom Configs", ...result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 7) ✅ HR: ปรับโควต้า "พนักงานคนเดียว" แยกประเภท (หลายประเภทพร้อมกัน)
exports.updateEmployeeQuotasByType = async (req, res) => {
  try {
    const employeeId = parseInt(req.params.employeeId, 10);
    const { quotas, year, configs = {} } = req.body; // รับ configs เพิ่ม (ถ้ามี)

    if (!Number.isFinite(employeeId) || employeeId <= 0) {
      throw new Error("employeeId incorrect");
    }

    const normalized = normalizeQuotas(quotas);
    const typeNames = Object.keys(normalized);
    const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();

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
        let newBase = Number(normalized[key] || 0);
        
        // ดึง Config สำหรับประเภทลานี้ (ถ้าไม่มีให้ใช้ค่า default ที่สูงไว้ก่อน)
        const setting = configs[key] || { totalCap: 999 };

        // 1. ดึงข้อมูลปัจจุบัน (ต้องดูทั้ง Used และ Carry)
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

        const currentUsed = existing ? Number(existing.usedDays || 0) : 0;
        const currentCarry = existing ? Number(existing.carryOverDays || 0) : 0;

        // 2. คำนวณ Safe Total แบบใหม่
        // Step A: เช็คว่า Base ใหม่ + Carry เดิม เกิน Total Cap ไหม?
        let safeBase = newBase;
        if (safeBase + currentCarry > setting.totalCap) {
          safeBase = Math.max(setting.totalCap - currentCarry, 0);
        }

        // Step B: เช็คว่า Base ใหม่ + Carry เดิม ต้องไม่ต่ำกว่าวันที่ใช้ไปแล้ว
        if (safeBase + currentCarry < currentUsed) {
          safeBase = Math.max(currentUsed - currentCarry, 0);
        }

        // 3. Upsert ข้อมูล
        await tx.leaveQuota.upsert({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId,
              leaveTypeId: lt.id,
              year: targetYear,
            },
          },
          update: { 
            totalDays: safeBase 
          },
          create: {
            employeeId,
            leaveTypeId: lt.id,
            year: targetYear,
            totalDays: safeBase,
            carryOverDays: currentCarry,
            usedDays: 0,
          },
        });

        updatedCount++;
      }

      return { updatedCount };
    });

    res.json({
      message: "Employee quota updated successfully. Cap applied & Carry-over preserved.",
      employeeId,
      year: targetYear,
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
