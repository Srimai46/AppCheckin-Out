// backend/src/controllers/leaveController.js

const prisma = require("../config/prisma");
const { calculateTotalDays } = require("../utils/leaveHelpers");

// =========================================================
// ✅ Constants / Policies
// =========================================================
const ANNUAL_CARRY_CAP = 12;  // ทบ Annual ข้ามปี ได้ไม่เกิน 12
const ANNUAL_TOTAL_CAP = 12;  // Annual ต่อปี (totalDays) ไม่เกิน 12
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
    if (nextTotal != null) nextTotal = Math.min(Number(nextTotal) || 0, ANNUAL_TOTAL_CAP);
    if (nextCarry != null) nextCarry = Math.min(Number(nextCarry) || 0, ANNUAL_CARRY_CAP);
  }

  return { totalDays: nextTotal, carryOverDays: nextCarry };
};

// ---------------------------------------------------------
// ส่วนของ Worker (พนักงานทั่วไป)
// ---------------------------------------------------------

// 1. ดึงโควตาของตัวเอง
exports.getMyQuotas = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();

    const quotas = await prisma.leaveQuota.findMany({
      where: { employeeId: req.user.id, year: currentYear },
      include: { leaveType: true },
    });

    res.json(
      quotas.map((q) => {
        const totalAvailable = Number(q.totalDays) + Number(q.carryOverDays);
        return {
          type: q.leaveType.typeName,
          baseQuota: Number(q.totalDays),
          carryOver: Number(q.carryOverDays),
          total: totalAvailable,
          used: Number(q.usedDays),
          remaining: totalAvailable - Number(q.usedDays),
        };
      })
    );
  } catch (error) {
    res.status(500).json({ error: "ดึงข้อมูลโควตาผิดพลาด" });
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
    const { type, startDate, endDate, reason, startDuration, endDuration } = req.body;
    const userId = req.user.id;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const year = start.getFullYear();

    // ✅ Validate วันที่
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "รูปแบบวันที่ไม่ถูกต้อง" });
    }
    if (start > end) {
      return res.status(400).json({ error: "วันเริ่มต้องไม่มากกว่าวันสิ้นสุด" });
    }

    const attachmentUrl = req.file ? `/uploads/leaves/${req.file.filename}` : null;

    const leaveType = await prisma.leaveType.findUnique({ where: { typeName: type } });
    if (!leaveType) return res.status(400).json({ error: "ไม่พบประเภทการลานี้" });

    const totalDaysRequested = calculateTotalDays(start, end, startDuration, endDuration);

    // ✅ Validate จำนวนวันลา
    if (totalDaysRequested <= 0) {
      return res.status(400).json({
        error: "จำนวนวันลาต้องมากกว่า 0 (ตรวจสอบวันหยุดหรือวันหยุดสุดสัปดาห์)",
      });
    }
    if (totalDaysRequested % 0.5 !== 0) {
      return res.status(400).json({
        error: "รูปแบบวันลาไม่ถูกต้อง (ต้องเป็นเต็มวันหรือครึ่งวัน)",
      });
    }

    // (เลือกใช้ตาม policy) กรณีลาหลายวันห้ามครึ่งวันทั้งต้นและท้าย
    if (
      start.getTime() !== end.getTime() &&
      startDuration !== "Full" &&
      endDuration !== "Full"
    ) {
      return res.status(400).json({
        error: "การลาหลายวัน ต้องมีอย่างน้อย 1 วันเป็นเต็มวัน",
      });
    }

    // ✅ validate maxConsecutiveDays
    if (leaveType.maxConsecutiveDays > 0 && totalDaysRequested > leaveType.maxConsecutiveDays) {
      return res.status(400).json({
        error: `ประเภทการลา ${type} ห้ามลาติดต่อกันเกิน ${leaveType.maxConsecutiveDays} วัน`,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const overlap = await tx.leaveRequest.findFirst({
        where: {
          employeeId: userId,
          status: { in: ["Pending", "Approved"] },
          OR: [{ startDate: { lte: end }, endDate: { gte: start } }],
        },
      });
      if (overlap) throw new Error("คุณมีรายการลาทับซ้อนในช่วงเวลานี้อยู่แล้ว");

      const quota = await tx.leaveQuota.findUnique({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: userId,
            leaveTypeId: leaveType.id,
            year,
          },
        },
      });

      if (!quota) throw new Error("ไม่พบโควตาวันลาของคุณสำหรับปีนี้");

      const remaining =
        Number(quota.totalDays) + Number(quota.carryOverDays || 0) - Number(quota.usedDays);

      if (remaining < totalDaysRequested) {
        throw new Error(`วันลาคงเหลือไม่พอ (เหลือ ${remaining} วัน)`);
      }

      return await tx.leaveRequest.create({
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
      });
    });

    res.status(201).json({ message: "ส่งคำขอลาสำเร็จ", data: result });
  } catch (error) {
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
          select: { id: true, firstName: true, lastName: true, email: true, profileImageUrl: true },
        },
        leaveType: true,
      },
      orderBy: { requestedAt: "asc" },
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: "ไม่สามารถดึงรายการได้" });
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
    res.status(500).json({ error: "ดึงข้อมูลผิดพลาด" });
  }
};

// 3. อนุมัติหรือปฏิเสธคำขอลา
exports.updateLeaveStatus = async (req, res) => {
  try {
    const { id, status, isSpecial } = req.body;
    const hrId = req.user.id;
    const leaveId = parseInt(id);

    if (!leaveId) return res.status(400).json({ error: "ID ไม่ถูกต้อง" });

    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.leaveRequest.findUnique({
        where: { id: leaveId },
        include: { leaveType: true },
      });

      if (!request || request.status !== "Pending") {
        throw new Error("ใบลาไม่อยู่ในสถานะที่ดำเนินการได้");
      }

      const updatedRequest = await tx.leaveRequest.update({
        where: { id: leaveId },
        data: {
          status,
          approvedByHrId: hrId,
          approvalDate: new Date(),
          isSpecialApproved: status === "Approved" ? (isSpecial || false) : false,
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

      let notifyMsg = `คำขอลาของคุณได้รับการ ${status === "Approved" ? "อนุมัติ" : "ปฏิเสธ"}`;
      if (status === "Approved" && isSpecial) {
        notifyMsg = `คำขอลาของคุณได้รับการอนุมัติเป็นกรณีพิเศษ (ไม่หักวันลา)`;
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
      io.to(`user_${result.updatedRequest.employeeId}`).emit("new_notification", {
        id: result.newNotification.id,
        message: result.newNotification.message,
        type: result.newNotification.notificationType,
        relatedRequestId: result.newNotification.relatedRequestId,
        createdAt: result.newNotification.createdAt,
        unreadCount: result.unreadCount,
      });
    }

    res.json({
      message: `ดำเนินการ ${status}${isSpecial ? " (กรณีพิเศษ)" : ""} เรียบร้อยแล้ว`,
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

    res.json({ message: "จัดการโควตาสำเร็จ", data: result });
  } catch (error) {
    res.status(500).json({ error: "ล้มเหลว" });
  }
};

// 5. ✅ ประมวลผลทบวันลาที่เหลือจากปีก่อนหน้า (Annual only, cap 12)
exports.processCarryOver = async (req, res) => {
  try {
    const targetYear = parseInt(req.body?.targetYear, 10);
    if (!Number.isFinite(targetYear) || targetYear < 2000) {
      return res.status(400).json({ error: "targetYear ไม่ถูกต้อง" });
    }

    const lastYear = targetYear - 1;

    await prisma.$transaction(async (tx) => {
      const oldQuotas = await tx.leaveQuota.findMany({
        where: { year: lastYear },
        include: { leaveType: true },
      });

      for (const quota of oldQuotas) {
        const typeName = String(quota.leaveType?.typeName || "").toUpperCase();
        if (typeName !== "ANNUAL") continue;

        const totalDays = Number(quota.totalDays) || 0;
        const carryOverDays = Number(quota.carryOverDays) || 0;
        const usedDays = Number(quota.usedDays) || 0;

        const remaining = totalDays + carryOverDays - usedDays;
        const carryAmount = Math.min(Math.max(remaining, 0), ANNUAL_CARRY_CAP);
        if (carryAmount <= 0) continue;

        const existing = await tx.leaveQuota.findUnique({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: quota.employeeId,
              leaveTypeId: quota.leaveTypeId,
              year: targetYear,
            },
          },
        });

        if (existing) {
          const currentCarry = Number(existing.carryOverDays) || 0;
          const nextCarry = Math.min(currentCarry + carryAmount, ANNUAL_CARRY_CAP);

          await tx.leaveQuota.update({
            where: {
              employeeId_leaveTypeId_year: {
                employeeId: quota.employeeId,
                leaveTypeId: quota.leaveTypeId,
                year: targetYear,
              },
            },
            data: { carryOverDays: nextCarry },
          });
        } else {
          await tx.leaveQuota.create({
            data: {
              employeeId: quota.employeeId,
              leaveTypeId: quota.leaveTypeId,
              year: targetYear,
              totalDays: 0, // baseQuota ปีใหม่ให้ตั้งผ่าน policy/seed
              carryOverDays: carryAmount,
              usedDays: 0,
            },
          });
        }
      }
    });

    res.json({
      message: `ประมวลผลทบวันลา Annual ไปปี ${targetYear} สำเร็จ (carry ไม่เกิน 12 วัน)`,
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

    res.json({ message: "มอบสิทธิ์วันลาพิเศษสำเร็จ" });
  } catch (error) {
    res.status(500).json({ error: "ล้มเหลว" });
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
    if (!Number.isFinite(targetYear)) throw new Error("year ไม่ถูกต้อง");

    const leaveTypes = await getLeaveTypesByNames(typeNames);

    const employees = await prisma.employee.findMany({
      where: onlyActive ? { OR: [{ isActive: true }, { isActive: 1 }] } : undefined,
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
          let carryOverDays = existing ? Number(existing.carryOverDays || 0) : 0;

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
      message: "อัปเดตโควต้าวันลา (ทั้งบริษัท) สำเร็จ",
      year: targetYear,
      appliedTypes: typeNames,
      ...result,
    });
  } catch (error) {
    console.error("updateCompanyQuotasByType error:", error);
    res.status(400).json({ error: error.message || "อัปเดตไม่สำเร็จ" });
  }
};

// 8) ✅ HR: ปรับโควต้า "พนักงานคนเดียว" แยกประเภท (หลายประเภทพร้อมกัน)
exports.updateEmployeeQuotasByType = async (req, res) => {
  try {
    const employeeId = parseInt(req.params.employeeId, 10);
    const { quotas, year } = req.body;

    if (!Number.isFinite(employeeId) || employeeId <= 0) {
      throw new Error("employeeId ไม่ถูกต้อง");
    }

    const normalized = normalizeQuotas(quotas);
    const typeNames = Object.keys(normalized);

    const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
    if (!Number.isFinite(targetYear)) throw new Error("year ไม่ถูกต้อง");

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true },
    });
    if (!employee) throw new Error("ไม่พบพนักงาน");

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
      message: "อัปเดตโควต้าวันลา (รายคน) สำเร็จ",
      employeeId,
      year: targetYear,
      appliedTypes: typeNames,
      ...result,
    });
  } catch (error) {
    console.error("updateEmployeeQuotasByType error:", error);
    res.status(400).json({ error: error.message || "อัปเดตไม่สำเร็จ" });
  }
};
