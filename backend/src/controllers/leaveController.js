// backend/src/controllers/leaveController.js

const prisma = require("../config/prisma");
const { calculateTotalDays } = require("../utils/leaveHelpers");

// =========================================================
// ✅ Constants / Policies
// =========================================================
const ANNUAL_CARRY_CAP = 12; // ทบ Annual ข้ามปี ได้ไม่เกิน 12
const ANNUAL_TOTAL_CAP = 12; // Annual ต่อปี (totalDays) ไม่เกิน 12
const MAX_DAYS_LIMIT = 365;

const calculateActualLeaveDays = async (start, end, startDuration, endDuration) => {
  // 1. ดึงวันหยุดทั้งหมดในช่วงเวลาที่ลามารอไว้
  const holidays = await prisma.holiday.findMany({
    where: {
      date: { gte: start, lte: end },
    },
    select: { date: true },
  });
  const holidayDates = holidays.map((h) => h.date.toISOString().split("T")[0]);

  let total = 0;
  let current = new Date(start);
  const finish = new Date(end);

  while (current <= finish) {
    const dayOfWeek = current.getDay(); // 0=อาทิตย์, 6=เสาร์
    const dateStr = current.toISOString().split("T")[0];

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidayDates.includes(dateStr);

    // คำนวณเฉพาะวันทำงาน (ไม่ใช่วันหยุด และไม่ใช่เสาร์-อาทิตย์)
    if (!isWeekend && !isHoliday) {
      if (current.getTime() === start.getTime() && current.getTime() === finish.getTime()) {
        // กรณีลาวันเดียว
        total += (startDuration === "Full") ? 1 : 0.5;
      } else if (current.getTime() === start.getTime()) {
        // วันแรกของการลา
        total += (startDuration === "Full") ? 1 : 0.5;
      } else if (current.getTime() === finish.getTime()) {
        // วันสุดท้ายของการลา
        total += (endDuration === "Full") ? 1 : 0.5;
      } else {
        // วันระหว่างกลาง
        total += 1;
      }
    }
    current.setDate(current.getDate() + 1);
  }
  return total;
};

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
const capAnnual = ({ typeName, totalDays, carryOverDays, customMaxCarry }) => {
  const t = String(typeName || "").toUpperCase();
  let nextTotal = totalDays;
  let nextCarry = carryOverDays;

  const limit = customMaxCarry ?? ANNUAL_CARRY_CAP;

  if (t === "ANNUAL") {
    if (nextCarry !== undefined) {
      nextCarry = Math.max(0, Math.min(Number(nextCarry) || 0, limit));
    }
  }

  return { totalDays: nextTotal, carryOverDays: nextCarry };
};

// ---------------------------------------------------------
// ส่วนของ Worker (พนักงานทั่วไป)
// ---------------------------------------------------------

// 1. ดึงโควตาของตัวเอง
exports.getMyQuotas = async (req, res) => {
  try {
    // ใช้ปีปัจจุบันเป็นค่าเริ่มต้น
    let year = req.query.year
      ? parseInt(req.query.year, 10)
      : new Date().getFullYear();

    if (year > 2500) year -= 543;

    const quotas = await prisma.leaveQuota.findMany({
      where: {
        employeeId: req.user.id,
        year: year,
      },
      include: { leaveType: true },
    });

    const result = quotas.map((q) => {
      const base = parseFloat(q.totalDays) || 0;
      const carry = parseFloat(q.carryOverDays) || 0;
      const used = parseFloat(q.usedDays) || 0;
      const totalAvailable = base + carry;

      return {
        id: q.id,
        type: q.leaveType?.typeName || "Unknown",
        baseQuota: base,
        carryOver: carry,
        total: totalAvailable,
        used: used,
        remaining: totalAvailable - used,
        year: q.year,
      };
    });

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
      include: { 
        leaveType: true,
        // ✅ เพิ่มการดึงชื่อคนอนุมัติ (ถ้ามี)
        approvedByHr: {
          select: { firstName: true, lastName: true }
        }
      },
    });

    // ปรับโครงสร้างข้อมูลเล็กน้อยเพื่อให้หน้าบ้านใช้ง่ายขึ้น
    const formattedLeaves = leaves.map(l => ({
      ...l,
      leaveTypeName: l.leaveType?.typeName,
      approverName: l.approvedByHr ? `${l.approvedByHr.firstName} ${l.approvedByHr.lastName}` : "Pending",
      // ตรวจสอบ Full Path ของรูปภาพ/ไฟล์แนบ
      attachmentUrl: l.attachmentUrl ? `${process.env.BASE_URL || ''}${l.attachmentUrl}` : null
    }));

    res.json(formattedLeaves);
  } catch (error) {
    console.error("getMyLeaves Error:", error);
    res.status(500).json({ error: "Failed to fetch leave history" });
  }
};

// 3. ยื่นคำขอลาใหม่ (เพิ่ม validation แน่น)
exports.createLeaveRequest = async (req, res) => {
  try {
    const { type, startDate, endDate, reason, startDuration, endDuration } = req.body;
    const userId = req.user.id;

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0); // ล้างเวลา
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0); // ล้างเวลา
    const year = start.getFullYear();

    const config = await prisma.systemConfig.findUnique({ where: { year } });
    if (config?.isClosed) {
      return res.status(403).json({ error: `System for ${year} is locked for processing.` });
    }

    // ✅ 1. Validate วันที่
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Incorrect date format." });
    }
    if (start > end) {
      return res.status(400).json({ error: "Start date cannot be after end date." });
    }

    const leaveType = await prisma.leaveType.findUnique({ where: { typeName: type } });
    if (!leaveType) return res.status(400).json({ error: "Leave type not found." });

    // ✅ 2. คำนวณวันลาจริง (หักวันหยุด/เสาร์-อาทิตย์)
    const totalDaysRequested = await calculateActualLeaveDays(start, end, startDuration, endDuration);

    if (totalDaysRequested <= 0) {
      return res.status(400).json({ error: "Calculated leave days must be greater than 0 (Check if your request falls on weekends/holidays)." });
    }

    // ✅ 3. ตรวจสอบเงื่อนไขลาติดต่อกัน
    const maxConsecutive = Number(leaveType.maxConsecutiveDays ?? 0);
    if (maxConsecutive > 0 && totalDaysRequested > maxConsecutive) {
      return res.status(400).json({ error: `You cannot take ${type} leave for more than ${maxConsecutive} consecutive days.` });
    }

    const attachmentUrl = req.file ? `/uploads/leaves/${req.file.filename}` : null;

    // ✅ 4. Transaction
    const result = await prisma.$transaction(async (tx) => {
      // ตรวจสอบใบลาทับซ้อน
      const overlap = await tx.leaveRequest.findFirst({
        where: {
          employeeId: userId,
          status: { in: ["Pending", "Approved"] },
          OR: [{ startDate: { lte: end }, endDate: { gte: start } }],
        },
      });
      if (overlap) throw new Error("Overlapping leave request found.");

      // ตรวจสอบโควตา
      const quota = await tx.leaveQuota.findUnique({
        where: { employeeId_leaveTypeId_year: { employeeId: userId, leaveTypeId: leaveType.id, year } },
      });

      if (!quota) throw new Error("No quota found for this year.");

      const remaining = Number(quota.totalDays) + Number(quota.carryOverDays || 0) - Number(quota.usedDays);
      if (remaining < totalDaysRequested) {
        throw new Error(`Insufficient balance. You have ${remaining} days left.`);
      }

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

      // แจ้งเตือน HR
      const admins = await tx.employee.findMany({
        where: { role: "HR", id: { not: userId } },
        select: { id: true },
      });

      const fullName = `${newLeave.employee.firstName} ${newLeave.employee.lastName}`;
      const notificationMsg = `${fullName} requested ${type} leave for ${totalDaysRequested} days.`;

      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            employeeId: admin.id,
            notificationType: "NewRequest",
            message: notificationMsg,
            relatedRequestId: newLeave.id,
          })),
        });

        const adminUpdates = await Promise.all(
          admins.map(async (admin) => {
            const count = await tx.notification.count({ where: { employeeId: admin.id, isRead: false } });
            return { adminId: admin.id, unreadCount: count };
          })
        );
        return { newLeave, adminUpdates, message: notificationMsg };
      }
      return { newLeave, adminUpdates: [] };
    });

    // ✅ 5. Socket.io
    const io = req.app.get("io");
    if (io && result.adminUpdates.length > 0) {
      result.adminUpdates.forEach((update) => {
        io.to(`user_${update.adminId}`).emit("new_notification", {
          message: result.message,
          notificationType: "NewRequest",
          unreadCount: update.unreadCount,
        });
      });
    }

    res.status(201).json({ message: "Request submitted.", data: result.newLeave });
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
    const currentYear = new Date().getFullYear();

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
            // ✅ ดึงโควต้าของพนักงานคนนี้ในปีปัจจุบันมาด้วย
            leaveQuotas: {
              where: { year: currentYear },
              select: {
                leaveTypeId: true,
                totalDays: true,
                usedDays: true,
                carryOverDays: true
              }
            }
          },
        },
        leaveType: true,
      },
      orderBy: { requestedAt: "asc" },
    });

    // ✅ ปรับ Format ข้อมูลเล็กน้อยเพื่อให้หน้าบ้านแสดงผล "โควต้าคงเหลือ" ของประเภทที่ลาได้ทันที
    const formattedRequests = requests.map(req => {
      const quotaForThisType = req.employee.leaveQuotas.find(q => q.leaveTypeId === req.leaveTypeId);
      
      return {
        ...req,
        quotaInfo: quotaForThisType ? {
          remaining: (parseFloat(quotaForThisType.totalDays) + parseFloat(quotaForThisType.carryOverDays || 0)) - parseFloat(quotaForThisType.usedDays),
          total: parseFloat(quotaForThisType.totalDays) + parseFloat(quotaForThisType.carryOverDays || 0)
        } : null
      };
    });

    res.json(formattedRequests);
  } catch (error) {
    console.error("getPendingRequests Error:", error);
    res.status(500).json({ error: "Failed to fetch pending requests." });
  }
};

// 2. ดึงคำขอลาทั้งหมด
exports.getAllLeaves = async (req, res) => {
  try {
    const { status, year, employeeName } = req.query;
    
    // สร้างเงื่อนไขการกรองข้อมูล
    const where = {};
    
    if (status) {
      where.status = status; // เช่น ?status=Approved
    }
    
    if (year) {
      const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
      const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);
      where.startDate = { gte: startOfYear, lte: endOfYear };
    }

    if (employeeName) {
      where.employee = {
        OR: [
          { firstName: { contains: employeeName } },
          { lastName: { contains: employeeName } }
        ]
      };
    }

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: { select: { firstName: true, lastName: true, role: true } },
        leaveType: { select: { typeName: true } },
        approvedByHr: { select: { firstName: true, lastName: true } } // ✅ เพิ่มคนอนุมัติ
      },
      orderBy: { requestedAt: "desc" }, // เรียงตามลำดับการส่งใบลาล่าสุด
    });

    const result = leaves.map((l) => ({
      id: l.id,
      name: `${l.employee.firstName} ${l.employee.lastName}`,
      type: l.leaveType.typeName,
      startDate: l.startDate,
      endDate: l.endDate,
      totalDays: Number(l.totalDaysRequested),
      status: l.status,
      reason: l.reason,
      attachmentUrl: l.attachmentUrl,
      requestedAt: l.requestedAt,
      approverName: l.approvedByHr ? `${l.approvedByHr.firstName} ${l.approvedByHr.lastName}` : null
    }));

    res.json(result);
  } catch (error) {
    console.error("getAllLeaves Error:", error);
    res.status(500).json({ error: "Failed to retrieve overall leave data." });
  }
};

// 3. อนุมัติหรือปฏิเสธคำขอลา
exports.updateLeaveStatus = async (req, res) => {
  try {
    const { id, status, isSpecial } = req.body;
    const hrId = req.user.id;
    const leaveId = parseInt(id, 10);

    if (!leaveId) return res.status(400).json({ error: "Invalid leave ID" });

    const result = await prisma.$transaction(async (tx) => {
      // 1. ดึงข้อมูลใบลามาตรวจสอบ
      const request = await tx.leaveRequest.findUnique({
        where: { id: leaveId },
        include: { leaveType: true },
      });

      if (!request || request.status !== "Pending") {
        throw new Error("This request is no longer pending or does not exist.");
      }

      // 2. อัปเดตสถานะใบลา
      const updatedRequest = await tx.leaveRequest.update({
        where: { id: leaveId },
        data: {
          status,
          approvedByHrId: hrId,
          approvalDate: new Date(),
          isSpecialApproved: status === "Approved" ? isSpecial || false : false,
        },
      });

      // 3. จัดการหักโควต้ากรณี Approved และไม่ใช่มูลเหตุพิเศษ
      if (status === "Approved" && !isSpecial) {
        const startYear = request.startDate.getFullYear();
        const endYear = request.endDate.getFullYear();

        // 💡 กรณีลาปีเดียวกัน (ปกติ) หรือ ลาคร่อมปี
        if (startYear === endYear) {
          // หักจากปีเดียวตามปกติ
          await tx.leaveQuota.update({
            where: {
              employeeId_leaveTypeId_year: {
                employeeId: request.employeeId,
                leaveTypeId: request.leaveTypeId,
                year: startYear,
              },
            },
            data: { usedDays: { increment: request.totalDaysRequested } },
          });
        } else {
          // 🚀 กรณีลาคร่อมปี: ต้องคำนวณแยกส่วน
          // คุณอาจจะเลือกหักปีที่ "เริ่มลา" ทั้งหมด หรือจะใช้ Logic คำนวณวันแยกปี 
          // ในที่นี้แนะนำให้หักปีที่เริ่มลา (StartYear) ตามนโยบายส่วนใหญ่
          await tx.leaveQuota.update({
            where: {
              employeeId_leaveTypeId_year: {
                employeeId: request.employeeId,
                leaveTypeId: request.leaveTypeId,
                year: startYear,
              },
            },
            data: { usedDays: { increment: request.totalDaysRequested } },
          });
        }
      }

      // 4. สร้างการแจ้งเตือน
      let notifyMsg = `Your ${request.leaveType.typeName} request has been ${status.toLowerCase()}.`;
      if (status === "Approved" && isSpecial) {
        notifyMsg = `Your leave was approved as a special case (No days deducted).`;
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

    // 5. Real-time Notification via Socket.io
    const io = req.app.get("io");
    if (io) {
      io.to(`user_${result.updatedRequest.employeeId}`).emit("new_notification", {
        id: result.newNotification.id,
        message: result.newNotification.message,
        type: result.newNotification.notificationType,
        unreadCount: result.unreadCount,
      });
    }

    res.json({
      message: `Status updated to ${status}${isSpecial ? " (Special Case)" : ""}`,
      data: result.updatedRequest,
    });
  } catch (error) {
    console.error("UpdateLeaveStatus Error:", error);
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
