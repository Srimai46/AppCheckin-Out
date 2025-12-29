// backend/src/controllers/leaveController.js

const prisma = require("../config/prisma");
const { calculateTotalDays } = require("../utils/leaveHelpers");
const { auditLog } = require("../utils/logger");

// =========================================================
// ✅ Constants / Policies
// =========================================================
const ANNUAL_CARRY_CAP = 12; // ทบ Annual ข้ามปี ได้ไม่เกิน 12
const ANNUAL_TOTAL_CAP = 12; // Annual ต่อปี (totalDays) ไม่เกิน 12
const MAX_DAYS_LIMIT = 365;

const fs = require("fs");
const path = require("path");

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

    // ตรวจสอบว่าเป็นตัวเลขที่ถูกต้อง (รวมถึงทศนิยม)
    if (isNaN(n) || n < 0 || n > MAX_DAYS_LIMIT) {
      throw new Error(`ค่าโควต้าของ ${key} ต้องเป็นตัวเลข 0-${MAX_DAYS_LIMIT}`);
    }

    // เปลี่ยนจาก Math.floor เป็น n เพื่อรองรับกรณีลา 0.5 วัน
    // แต่ถ้าบริษัทคุณบังคับเป็นจำนวนเต็มเท่านั้น ให้ใช้ Math.floor(n) ตามเดิมครับ
    normalized[key] = n;
  }

  if (Object.keys(normalized).length === 0) {
    throw new Error("quotas ว่างเปล่า");
  }

  // Hard cap: Annual totalDays ต่อปี ไม่เกิน 12 (รักษา Logic เดิมของคุณไว้)
  if (normalized.ANNUAL !== undefined) {
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
const validateAndApplyQuotaCaps = ({
  typeName,
  totalDays,
  carryOverDays,
  currentUsed = 0,
  // HR ส่งค่าเหล่านี้มาจากหน้าจอ Config
  hrMaxCarry, // เพดานการทบที่ HR กำหนดเองในหน้าจอ
  hrTotalCap, // เพดานยอดรวมที่ HR กำหนดเองในหน้าจอ
}) => {
  const t = String(typeName || "").toUpperCase();
  let base = Number(totalDays) || 0;
  let carry = Number(carryOverDays) || 0;
  const used = Number(currentUsed) || 0;

  // 1. ใช้ค่าที่ HR กำหนด (ถ้าไม่ส่งมา ถึงจะใช้ Default ของระบบ)
  const carryLimit = hrMaxCarry ?? (t === "ANNUAL" ? DEFAULT_ANNUAL_CARRY : 0);
  carry = Math.max(0, Math.min(carry, carryLimit));

  // 2. ใช้เพดานรวมที่ HR กำหนดเอง
  const capLimit = hrTotalCap ?? (t === "ANNUAL" ? DEFAULT_ANNUAL_TOTAL : 999);

  if (base + carry > capLimit) {
    // ระบบจะปรับลด base ลงเพื่อให้ (base + carry) ไม่เกินที่ HR ตั้งไว้
    base = Math.max(0, capLimit - carry);
  }

  // 3. ป้องกันวันลาติดลบ (HR ก็ลดโควต้าลงไปต่ำกว่าที่พนักงานใช้ไปแล้วไม่ได้)
  if (base + carry < used) {
    base = Math.max(used - carry, 0);
  }

  return { finalBase: base, finalCarry: carry };
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
    const userId = req.user.id;
    const currentYear = new Date().getFullYear();

    // 1. ดึงโควต้าของพนักงานในปีปัจจุบัน
    const quotas = await prisma.leaveQuota.findMany({
      where: { employeeId: userId, year: currentYear },
      include: { leaveType: true },
    });

    // 2. ดึงประวัติการลาทั้งหมด
    const leaves = await prisma.leaveRequest.findMany({
      where: { employeeId: userId },
      orderBy: { requestedAt: "desc" },
      include: {
        leaveType: true,
        approvedByHr: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // 3. จัดการข้อมูลสรุปยอด (Summary)
    const summary = quotas.map((q) => {
      const totalAllowed = Number(q.totalDays) + Number(q.carryOverDays || 0);
      const used = Number(q.usedDays || 0);
      return {
        leaveTypeName: q.leaveType.typeName,
        totalAllowed: totalAllowed,
        used: used,
        remaining: totalAllowed - used,
      };
    });

    // 4. ปรับโครงสร้างข้อมูลประวัติการลา (Formatted History)
    const formattedLeaves = leaves.map((l) => {
      // Logic สำหรับแสดงสถานะผู้จัดการ (Approver Display)
      let approverDisplay = "-";
      if (l.approvedByHr) {
        approverDisplay = `${l.approvedByHr.firstName} ${l.approvedByHr.lastName}`;
      } else if (l.status === "Pending") {
        approverDisplay = "Waiting for HR";
      } else if (l.status === "Withdraw_Pending") {
        approverDisplay = "Withdrawal Reviewing"; 
      }

      return {
        id: l.id,
        typeName: l.leaveType?.typeName,
        startDate: l.startDate,
        endDate: l.endDate,
        totalDaysRequested: Number(l.totalDaysRequested),
        status: l.status,
        reason: l.reason, // เหตุผลตอนขอลา
        // ✅ เพิ่มฟิลด์เหตุผลการปฏิเสธ (จาก HR)
        rejectionReason: l.rejectionReason, 
        // ✅ เพิ่มฟิลด์เหตุผลการยกเลิก (จากพนักงาน)
        cancelReason: l.cancelReason, 
        requestedAt: l.requestedAt,
        approvalDate: l.approvalDate,
        isSpecialApproved: l.isSpecialApproved,
        approverName: approverDisplay,
        attachmentUrl: l.attachmentUrl
          ? `${process.env.BASE_URL || ""}${l.attachmentUrl}`
          : null,
      };
    });

    // ส่งกลับทั้ง Summary และ History ในทีเดียว
    res.json({
      summary,
      history: formattedLeaves,
    });
  } catch (error) {
    console.error("getMyLeaves Error:", error);
    res.status(500).json({ error: "Failed to fetch leave data" });
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

    // 1. ตรวจสอบสถานะปี (Locked/Open)
    const config = await prisma.systemConfig.findUnique({ where: { year } });
    if (config?.isClosed) {
      return res.status(403).json({ error: `System for ${year} is locked for processing.` });
    }

    // 2. Validate วันที่
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Incorrect date format." });
    }
    if (start > end) {
      return res.status(400).json({ error: "Start date cannot be after end date." });
    }

    const leaveType = await prisma.leaveType.findUnique({ where: { typeName: type } });
    if (!leaveType) return res.status(400).json({ error: "Leave type not found." });

    // 3. ดึงวันหยุด
    const queryEnd = new Date(end);
    queryEnd.setHours(23, 59, 59, 999);
    const holidays = await prisma.holiday.findMany({
      where: { date: { gte: start, lte: queryEnd } },
      select: { date: true },
    });
    const holidayDates = holidays.map((h) => h.date.toISOString().split('T')[0]);

    // 4. คำนวณวันลาจริง
    const totalDaysRequested = calculateTotalDays(start, end, startDuration, endDuration, holidayDates);

    // 5. ตรวจสอบวันหยุด
    if (totalDaysRequested <= 0) {
      return res.status(400).json({ error: "ไม่สามารถส่งคำขอลาได้ เนื่องจากวันที่คุณเลือกเป็นวันหยุดทั้งหมด" });
    }

    // 6. ตรวจสอบเงื่อนไขลาติดต่อกัน
    const maxConsecutive = Number(leaveType.maxConsecutiveDays ?? 0);
    if (maxConsecutive > 0 && totalDaysRequested > maxConsecutive) {
      return res.status(400).json({ error: `You cannot take ${type} leave for more than ${maxConsecutive} consecutive days.` });
    }

    const attachmentUrl = req.file ? `/uploads/leaves/${req.file.filename}` : null;

    // 7. Database Transaction
    const result = await prisma.$transaction(async (tx) => {
      // ตรวจสอบใบลาทับซ้อน
      const overlap = await tx.leaveRequest.findFirst({
        where: {
          employeeId: userId,
          status: { in: ["Pending", "Approved", "Withdraw_Pending"] },
          OR: [{ startDate: { lte: end }, endDate: { gte: start } }],
        },
      });
      if (overlap) throw new Error("Overlapping leave request found.");

      // ตรวจสอบโควต้า
      const quota = await tx.leaveQuota.findUnique({
        where: { employeeId_leaveTypeId_year: { employeeId: userId, leaveTypeId: leaveType.id, year } },
      });

      if (!quota) throw new Error(`No leave quota found for ${type} in ${year}.`);

      const remaining = Number(quota.totalDays) + Number(quota.carryOverDays || 0) - Number(quota.usedDays);
      if (remaining < totalDaysRequested) {
        throw new Error(`Insufficient balance. You have ${remaining} days left.`);
      }

      // 7.1 สร้างบันทึกใบลา
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

      // 7.2 บันทึก Audit Log
      await tx.auditLog.create({
        data: {
          action: "CREATE",
          modelName: "LeaveRequest",
          recordId: newLeave.id,
          performedById: userId,
          details: `Submitted ${type} leave request for ${totalDaysRequested} days`,
          newValue: newLeave,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        },
      });

      // 8. เตรียมข้อมูลแจ้งเตือน HR
      const admins = await tx.employee.findMany({
        where: { role: "HR", id: { not: userId } },
        select: { id: true },
      });

      // ✅ 8.1 นับยอดคำร้องที่ค้างทั้งหมดในระบบ (เพื่ออัปเดต Badge ของ HR)
      const totalPendingCount = await tx.leaveRequest.count({
        where: { status: { in: ["Pending", "Withdraw_Pending"] } }
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
            const count = await tx.notification.count({
              where: { employeeId: admin.id, isRead: false },
            });
            return { adminId: admin.id, unreadCount: count };
          })
        );
        return { newLeave, adminUpdates, message: notificationMsg, totalPendingCount };
      }
      return { newLeave, adminUpdates: [], totalPendingCount };
    });

    // 🚀 8. Real-time Notification
    const io = req.app.get("io");
    if (io) {
      // ✅ 8.1 ส่งอัปเดต Badge ให้ HR ทุกคนในห้อง 'hr_group'
      io.to("hr_group").emit("update_pending_count", {
        count: result.totalPendingCount,
        message: result.message
      });

      // 8.2 ส่งแจ้งเตือนรายบุคคล (Notification Bell)
      if (result.adminUpdates.length > 0) {
        result.adminUpdates.forEach((update) => {
          io.to(`user_${update.adminId}`).emit("new_notification", {
            message: result.message,
            notificationType: "NewRequest",
            unreadCount: update.unreadCount,
          });
        });
      }
    }

    res.status(201).json({ message: "Request submitted.", data: result.newLeave });
  } catch (error) {
    console.error("CreateLeaveRequest Error:", error);
    res.status(400).json({ error: error.message });
  }
};

exports.cancelLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    // ✅ 1. รับเหตุผลการยกเลิกจาก body
    const { cancelReason } = req.body; 
    const userId = req.user.id;
    const leaveId = parseInt(id, 10);

    if (!leaveId) return res.status(400).json({ error: "Invalid leave ID" });

    // 2. ดึงข้อมูลมาเช็คเบื้องต้น
    const request = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: { leaveType: true, employee: true },
    });

    if (!request) throw new Error("Leave request not found.");
    if (request.employeeId !== userId) throw new Error("Unauthorized.");

    // ตรวจสอบ: ห้ามยกเลิกย้อนหลัง
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(request.startDate);
    if (startDate <= today) {
      throw new Error("Cannot cancel/withdraw leave that has already started or passed.");
    }

    // ตรวจสอบสถานะที่อนุญาต
    if (!["Pending", "Approved"].includes(request.status)) {
      throw new Error(`Cannot cancel a request with status: ${request.status}`);
    }

    const result = await prisma.$transaction(async (tx) => {
      let targetStatus = "Cancelled"; 
      let actionType = "WITHDRAW"; 
      let messageToHr = `${request.employee.firstName} cancelled their ${request.leaveType.typeName} leave.`;

      // 3. ถ้า Approved ต้องเปลี่ยนเป็น 'Withdraw_Pending'
      if (request.status === "Approved") {
        targetStatus = "Withdraw_Pending";
        // ✅ แนบเหตุผลไปในข้อความแจ้งเตือน HR
        messageToHr = `${request.employee.firstName} requested to WITHDRAW approved ${request.leaveType.typeName} leave. Reason: ${cancelReason || 'Not specified'}`;
      }

      // 4. อัปเดตสถานะใบลา
      const updatedRequest = await tx.leaveRequest.update({
        where: { id: leaveId },
        data: {
          status: targetStatus,
          // ✅ บันทึกเหตุผลลงใน field cancelReason (อย่าลืมเพิ่มใน Schema นะครับ)
          cancelReason: cancelReason || null, 
          attachmentUrl: targetStatus === "Cancelled" ? null : request.attachmentUrl,
        },
      });

      // 5. บันทึก Audit Log
      await tx.auditLog.create({
        data: {
          action: actionType,
          modelName: "LeaveRequest",
          recordId: leaveId,
          performedById: userId,
          details: `User requested ${targetStatus}. Reason: ${cancelReason || 'N/A'}`,
          oldValue: { status: request.status },
          newValue: { status: targetStatus, cancelReason },
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        },
      });

      // 6. แจ้งเตือน HR (ใน Database)
      const admins = await tx.employee.findMany({
        where: { role: "HR" },
        select: { id: true },
      });

      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            employeeId: admin.id,
            notificationType: "NewRequest",
            message: messageToHr,
            relatedRequestId: leaveId,
          })),
        });
      }

      // 7. นับยอดงานค้างทั้งหมดใหม่สำหรับ HR Badge
      const totalPendingCount = await tx.leaveRequest.count({
        where: { status: { in: ["Pending", "Withdraw_Pending"] } }
      });

      const adminUpdates = await Promise.all(
        admins.map(async (admin) => {
          const count = await tx.notification.count({
            where: { employeeId: admin.id, isRead: false },
          });
          return { adminId: admin.id, unreadCount: count };
        })
      );

      return {
        updatedRequest,
        oldAttachment: targetStatus === "Cancelled" ? request.attachmentUrl : null,
        totalPendingCount,
        messageToHr,
        adminUpdates
      };
    });

    // 8. ลบไฟล์จริง (เฉพาะกรณี Cancelled ทันที)
    if (result.oldAttachment) {
      const fileName = path.basename(result.oldAttachment);
      const fullPath = path.join(process.cwd(), "uploads", "leaves", fileName);
      if (fs.existsSync(fullPath)) {
        fs.unlink(fullPath, (err) => { if (err) console.error(`❌ Delete error: ${fullPath}`, err); });
      }
    }

    // 🚀 9. Real-time Notification
    const io = req.app.get("io");
    if (io) {
      io.to("hr_group").emit("update_pending_count", {
        count: result.totalPendingCount,
        message: result.messageToHr
      });

      result.adminUpdates.forEach((update) => {
        io.to(`user_${update.adminId}`).emit("new_notification", {
          message: result.messageToHr,
          unreadCount: update.unreadCount,
          notificationType: "NewRequest"
        });
      });
    }

    const responseMsg =
      result.updatedRequest.status === "Withdraw_Pending"
        ? "Withdraw request submitted. Waiting for HR approval."
        : "Leave request cancelled successfully.";

    res.json({ message: responseMsg, data: result.updatedRequest });
  } catch (error) {
    console.error("CancelLeaveRequest Error:", error);
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
      where: {
        status: { in: ["Pending", "Withdraw_Pending"] },
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImageUrl: true,
            leaveQuotas: {
              where: { year: currentYear },
              select: {
                leaveTypeId: true,
                totalDays: true,
                usedDays: true,
                carryOverDays: true,
              },
            },
          },
        },
        leaveType: true,
      },
      orderBy: { requestedAt: "asc" },
    });

    const formattedRequests = requests.map((leave) => {
      const quotaForThisType = leave.employee.leaveQuotas.find(
        (q) => q.leaveTypeId === leave.leaveTypeId
      );

      let quotaInfo = null;
      if (quotaForThisType) {
        const total = Number(quotaForThisType.totalDays) + Number(quotaForThisType.carryOverDays || 0);
        const used = Number(quotaForThisType.usedDays);
        quotaInfo = {
          total: total,
          used: used,
          remaining: total - used,
        };
      }

      return {
        ...leave,
        totalDaysRequested: Number(leave.totalDaysRequested),
        quotaInfo,
        // ✅ ระบุเหตุผลการถอนใบลา (ถ้ามี) เพื่อให้ HR เห็นในหน้าจัดการ
        cancelReason: leave.cancelReason, 
        isWithdrawRequest: leave.status === "Withdraw_Pending"
      };
    });

    res.json(formattedRequests);
  } catch (error) {
    console.error("getPendingRequests Error:", error);
    res.status(500).json({ error: "Failed to fetch pending requests." });
  }
};

// 2. ดึงคำขอทั้งหมด (กรองสถานะ, ปี, ชื่อพนักงาน)
exports.getAllLeaves = async (req, res) => {
  try {
    const { status, year, employeeName, hrAction } = req.query;

    const where = {};
    
    // กรองตามสถานะ
    if (status) where.status = status;

    // กรองตามปี
    if (year) {
      const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
      const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);
      where.startDate = { gte: startOfYear, lte: endOfYear };
    }

    // กรองตามชื่อพนักงาน
    if (employeeName) {
      where.employee = {
        OR: [
          { firstName: { contains: employeeName, mode: "insensitive" } },
          { lastName: { contains: employeeName, mode: "insensitive" } },
        ],
      };
    }

    // กรองรายการที่จัดการโดย HR คนปัจจุบัน
    if (hrAction === "true") {
      where.approvedByHrId = req.user.id;
    }

    // ดึงข้อมูลวันหยุด
    const holidays = await prisma.holiday.findMany({ select: { date: true } });
    const holidayDates = holidays.map((h) => new Date(h.date).toLocaleDateString("en-CA"));

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, role: true, email: true } },
        leaveType: { select: { typeName: true } },
        approvedByHr: { select: { firstName: true, lastName: true } },
      },
      orderBy: { requestedAt: "desc" },
    });

    const result = leaves.map((l) => {
      const workingDays = getWorkingDaysList(
        l.startDate,
        l.endDate,
        holidayDates
      );

      return {
        id: l.id,
        employeeId: l.employee.id, 
        name: `${l.employee.firstName} ${l.employee.lastName}`,
        email: l.employee.email, 
        type: l.leaveType.typeName,
        startDate: l.startDate,
        endDate: l.endDate,
        totalDays: Number(l.totalDaysRequested),
        status: l.status,
        reason: l.reason, // เหตุผลตอนขอลา
        // ✅ ส่งออกเหตุผลทั้งฝั่ง HR และ ฝั่งพนักงาน
        rejectionReason: l.rejectionReason, 
        cancelReason: l.cancelReason, 
        attachmentUrl: l.attachmentUrl,
        requestedAt: l.requestedAt,

        approverName: l.approvedByHr
          ? `${l.approvedByHr.firstName} ${l.approvedByHr.lastName}`
          : null,
        approvalDate: l.approvalDate,
        isSpecialApproved: l.isSpecialApproved,
        workingDaysList: workingDays,
      };
    });

    res.json(result);
  } catch (error) {
    console.error("getAllLeaves Error:", error);
    res.status(500).json({ error: "Failed to retrieve overall leave data." });
  }
};

// 3. อนุมัติหรือปฏิเสธคำขอลา
exports.updateLeaveStatus = async (req, res) => {
  try {
    // 1. รับค่า (รวมเหตุผลการปฏิเสธ)
    const { id, status, isSpecial, rejectionReason } = req.body;
    const hrId = req.user.id;
    const leaveId = parseInt(id, 10);
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!leaveId) return res.status(400).json({ error: "Invalid leave ID" });

    let fileToDelete = null;

    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.leaveRequest.findUnique({
        where: { id: leaveId },
        include: { leaveType: true },
      });

      if (!request) throw new Error("Leave request not found.");

      const currentStatus = request.status;
      let finalStatus = status;
      let auditAction = status === "Approved" ? "APPROVE" : "REJECT";
      const startDate = new Date(request.startDate);
      const isPastLeave = startDate < today;

      // Guard: ใบลาหมดอายุ
      if (currentStatus === "Pending" && isPastLeave && status === "Approved" && !isSpecial) {
        throw new Error("This leave request has already expired. Please reject it or use 'Special Approve' for backdated processing.");
      }

      // Logic: Withdraw (ถอนใบลา)
      if (currentStatus === "Withdraw_Pending") {
        if (status === "Approved") {
          finalStatus = "Cancelled";
          fileToDelete = request.attachmentUrl;
          if (!request.isSpecialApproved) {
            await tx.leaveQuota.update({
              where: {
                employeeId_leaveTypeId_year: {
                  employeeId: request.employeeId,
                  leaveTypeId: request.leaveTypeId,
                  year: startDate.getFullYear(),
                },
              },
              data: { usedDays: { decrement: request.totalDaysRequested } },
            });
          }
        } else {
          finalStatus = "Approved"; 
        }
      } 
      // Logic: New Request (ใบลาใหม่)
      else if (currentStatus === "Pending") {
        if (status === "Rejected") fileToDelete = request.attachmentUrl;
        if (status === "Approved" && !isSpecial) {
          await tx.leaveQuota.update({
            where: {
              employeeId_leaveTypeId_year: {
                employeeId: request.employeeId,
                leaveTypeId: request.leaveTypeId,
                year: startDate.getFullYear(),
              },
            },
            data: { usedDays: { increment: request.totalDaysRequested } },
          });
        }
      } else {
        throw new Error(`Cannot update request in ${currentStatus} status.`);
      }

      // 2. อัปเดต DB
      const updatedRequest = await tx.leaveRequest.update({
        where: { id: leaveId },
        data: {
          status: finalStatus,
          rejectionReason: (finalStatus === "Rejected" || finalStatus === "Cancelled") ? (rejectionReason || null) : null,
          approvedByHrId: hrId,
          approvalDate: now,
          isSpecialApproved: currentStatus === "Pending" && finalStatus === "Approved" ? (isSpecial || false) : request.isSpecialApproved,
          attachmentUrl: (finalStatus === "Cancelled" || finalStatus === "Rejected") ? null : request.attachmentUrl,
        },
      });

      // 3. Audit Log
      await auditLog(tx, {
        action: auditAction,
        modelName: "LeaveRequest",
        recordId: leaveId,
        userId: hrId,
        details: `HR ${auditAction} leave from ${currentStatus} to ${finalStatus}. ${rejectionReason ? `Reason: ${rejectionReason}` : ""}`,
        oldValue: { status: currentStatus },
        newValue: { status: finalStatus, rejectionReason: updatedRequest.rejectionReason },
        req: req,
      });

      // 4. Notification Message
      let notifyMsg = `Your ${request.leaveType.typeName} request has been ${finalStatus.toLowerCase()}.`;
      if (finalStatus === "Rejected" && rejectionReason) {
        notifyMsg += ` Reason: ${rejectionReason}`;
      } else if (currentStatus === "Withdraw_Pending" && finalStatus === "Cancelled") {
        notifyMsg = `Withdrawal for ${request.leaveType.typeName} approved. Quota refunded.`;
      }

      const newNotification = await tx.notification.create({
        data: {
          employeeId: request.employeeId,
          notificationType: finalStatus === "Approved" ? "Approval" : "Rejection",
          message: notifyMsg,
          relatedRequestId: request.id,
        },
      });

      // 5. นับยอดงานค้างให้ HR
      const unreadCount = await tx.notification.count({ where: { employeeId: request.employeeId, isRead: false } });
      const totalPendingCount = await tx.leaveRequest.count({ where: { status: { in: ["Pending", "Withdraw_Pending"] } } });

      return { updatedRequest, newNotification, unreadCount, auditAction, totalPendingCount };
    });

    // ลบไฟล์
    if (fileToDelete) {
      const fileName = path.basename(fileToDelete);
      const fullPath = path.join(process.cwd(), "uploads", "leaves", fileName);
      if (fs.existsSync(fullPath)) {
        fs.unlink(fullPath, (err) => { if (err) console.error("❌ File delete error:", err); });
      }
    }

    // 6. Socket Notification
    const io = req.app.get("io");
    if (io) {
      io.to(`user_${result.updatedRequest.employeeId}`).emit("new_notification", {
        message: result.newNotification.message,
        unreadCount: result.unreadCount,
        type: result.auditAction,
        requestId: result.updatedRequest.id,
        newStatus: result.updatedRequest.status,
        rejectionReason: result.updatedRequest.rejectionReason
      });

      io.to("hr_group").emit("update_pending_count", {
        count: result.totalPendingCount
      });
    }

    res.json({ message: `Success: ${result.auditAction}`, data: result.updatedRequest });

  } catch (error) {
    console.error("UpdateLeaveStatus Error:", error);
    res.status(400).json({ error: error.message });
  }
};

// 4. HR: ประมวลผลทบวันลาข้ามปี (Custom Logic)
exports.processCarryOver = async (req, res) => {
  try {
    const { targetYear, quotas = {}, carryConfigs = {} } = req.body;
    const tYear = parseInt(targetYear, 10);
    const lastYear = tYear - 1;
    const userId = req.user.id; // ดึง ID ของ HR ที่รันระบบ

    if (!tYear || isNaN(tYear)) throw new Error("Invalid targetYear.");

    const result = await prisma.$transaction(async (tx) => {
      // 1. ตรวจสอบสถานะปีเก่า
      const configOld = await tx.systemConfig.findUnique({
        where: { year: lastYear },
      });
      if (configOld?.isClosed)
        throw new Error(`Year ${lastYear} is already closed.`);

      // 2. ดึงข้อมูลพนักงานและประเภทวันลา
      const allEmployees = await tx.employee.findMany({
        where: { isActive: true },
      });
      const leaveTypes = await tx.leaveType.findMany();

      let processedCount = 0;

      // วนลูปประมวลผล (Business Logic เดิมของคุณ)
      for (const emp of allEmployees) {
        for (const type of leaveTypes) {
          const typeName = type.typeName.toUpperCase();
          const setting = carryConfigs[typeName] || {
            maxCarry: 0,
            totalCap: 999,
          };

          const oldQuota = await tx.leaveQuota.findUnique({
            where: {
              employeeId_leaveTypeId_year: {
                employeeId: emp.id,
                leaveTypeId: type.id,
                year: lastYear,
              },
            },
          });

          let rawCarry = 0;
          if (oldQuota) {
            const remaining =
              Number(oldQuota.totalDays) +
              Number(oldQuota.carryOverDays) -
              Number(oldQuota.usedDays);
            rawCarry = Math.max(remaining, 0);
          }

          const { finalBase, finalCarry } = validateAndApplyQuotaCaps({
            typeName: typeName,
            totalDays: Number(quotas[typeName] || 0),
            carryOverDays: rawCarry,
            hrMaxCarry: setting.maxCarry,
            hrTotalCap: setting.totalCap,
          });

          await tx.leaveQuota.upsert({
            where: {
              employeeId_leaveTypeId_year: {
                employeeId: emp.id,
                leaveTypeId: type.id,
                year: tYear,
              },
            },
            update: { totalDays: finalBase, carryOverDays: finalCarry },
            create: {
              employeeId: emp.id,
              leaveTypeId: type.id,
              year: tYear,
              totalDays: finalBase,
              carryOverDays: finalCarry,
              usedDays: 0,
            },
          });
        }
        processedCount++;
      }

      // 3. ปิดงวดปีเก่า และ เปิดงวดปีใหม่
      await tx.systemConfig.upsert({
        where: { year: lastYear },
        update: { isClosed: true, closedAt: new Date(), processedBy: userId },
        create: {
          year: lastYear,
          isClosed: true,
          closedAt: new Date(),
          processedBy: userId,
        },
      });

      await tx.systemConfig.upsert({
        where: { year: tYear },
        update: { isClosed: false },
        create: { year: tYear, isClosed: false },
      });

      // 4. บันทึก Audit Log (Big Log สำหรับการรันระบบขึ้นปีใหม่)
      await tx.auditLog.create({
        data: {
          action: "SYSTEM_LOCK", // หรือ "PROCESS_CARRY_OVER"
          modelName: "SystemConfig",
          recordId: tYear,
          performedById: userId,
          details: `Processed carry over from ${lastYear} to ${tYear}. Total employees: ${allEmployees.length}`,
          // เก็บค่า Config ที่ HR ใช้รันในครั้งนี้ไว้ดูย้อนหลัง
          newValue: {
            targetYear: tYear,
            baseQuotasSent: quotas,
            carryConfigsUsed: carryConfigs,
          },
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        },
      });

      // 5. สร้าง Notification สรุป
      const notifyData = allEmployees.map((emp) => ({
        employeeId: emp.id,
        notificationType: "Approval",
        message: `Your leave quotas for ${tYear} have been processed. Carry over: Checked.`,
      }));
      await tx.notification.createMany({ data: notifyData });

      return processedCount;
    });

    const io = req.app.get("io");
    if (io) io.emit("notification_refresh");

    res.json({ message: "Success", employeesProcessed: result });
  } catch (error) {
    console.error("processCarryOver Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// 5. HR: อนุมัติกรณีพิเศษ (ไม่หักโควต้า)
exports.grantSpecialLeave = async (req, res) => {
  try {
    const { employeeId, amount, reason, year, leaveRequestId } = req.body;
    const hrId = req.user.id;

    const specialType = await prisma.leaveType.findFirst({
      where: { typeName: "Special" },
    });

    if (!specialType) {
      return res.status(400).json({ error: "System Error: 'Special' leave type not found." });
    }

    const result = await prisma.$transaction(async (tx) => {
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

      // 2. จัดการ Quota หมวด Special (เพิ่ม total และ used ทันที)
      const updatedQuota = await tx.leaveQuota.upsert({
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

      // 3. อัปเดตใบลา (ถ้ามี)
      let updatedRequest = null;
      if (leaveRequestId) {
        updatedRequest = await tx.leaveRequest.update({
          where: { id: parseInt(leaveRequestId) },
          data: {
            status: "Approved",
            isSpecialApproved: true,
            leaveTypeId: specialType.id, // ✅ เปลี่ยนประเภทการลาเป็น Special
            specialGrantId: grant.id,
            approvedByHrId: hrId,
            approvalDate: new Date(),
          },
        });
      }

      // 4. บันทึก Audit Log (ใช้ตัวกลาง auditLog ถ้ามี หรือใช้แบบเดิม)
      const log = await tx.auditLog.create({
        data: {
          action: "GRANT_SPECIAL", 
          modelName: "SpecialLeaveGrant",
          recordId: grant.id,
          performedById: hrId,
          details: `HR granted ${amount} special days to Employee #${employeeId}. Reason: ${reason}`,
          newValue: { grant, quota: updatedQuota },
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        },
      });

      // 5. สร้างการแจ้งเตือนพนักงานรายบุคคล
      const notification = await tx.notification.create({
        data: {
          employeeId: parseInt(employeeId),
          notificationType: "Approval",
          message: `Your leave request #${leaveRequestId} has been approved as a SPECIAL case (${amount} days).`,
          relatedRequestId: leaveRequestId ? parseInt(leaveRequestId) : null,
        },
      });

      // 6. นับยอด Pending ใหม่สำหรับ HR Badge
      const totalPendingCount = await tx.leaveRequest.count({
        where: { status: { in: ["Pending", "Withdraw_Pending"] } }
      });

      const unreadCount = await tx.notification.count({
        where: { employeeId: parseInt(employeeId), isRead: false }
      });

      return { updatedRequest, totalPendingCount, unreadCount, notification };
    });

    // 🚀 7. Real-time Notification
    const io = req.app.get("io");
    if (io) {
      // ส่งถึงพนักงานคนนั้นโดยตรง
      io.to(`user_${employeeId}`).emit("new_notification", {
        message: result.notification.message,
        unreadCount: result.unreadCount,
        status: "Approved",
        isSpecial: true
      });

      // ส่งถึงห้อง HR ทุกคนเพื่ออัปเดต Badge
      io.to("hr_group").emit("update_pending_count", {
        count: result.totalPendingCount
      });
    }

    res.json({ message: "Special Case processed and logged successfully.", data: result.updatedRequest });
  } catch (error) {
    console.error("grantSpecialLeave Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// =========================================================
// ✅ HR: Update quotas by TYPE (Company-wide + Single employee)
// =========================================================

// 6. HR: ปรับโควต้า "ทั้งบริษัท" แยกประเภท (หลายประเภทพร้อมกัน)
exports.updateCompanyQuotasByType = async (req, res) => {
  try {
    const { quotas, year, onlyActive, configs = {} } = req.body;
    const hrId = req.user.id; // ดึง ID ของ HR ผู้กระทำการ

    // Normalize ปี
    let targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
    if (targetYear > 2500) targetYear -= 543;

    const normalized = normalizeQuotas(quotas);
    const typeNames = Object.keys(normalized);
    const leaveTypes = await getLeaveTypesByNames(typeNames);

    const employees = await prisma.employee.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      select: { id: true },
    });

    const result = await prisma.$transaction(
      async (tx) => {
        let updatedCount = 0;

        for (const emp of employees) {
          for (const lt of leaveTypes) {
            const typeName = lt.typeName.toUpperCase();
            const setting = configs[typeName] || {
              totalCap: typeName === "ANNUAL" ? 12 : 999,
            };

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

            const { finalBase, finalCarry } = validateAndApplyQuotaCaps({
              typeName: lt.typeName,
              totalDays: normalized[typeName],
              carryOverDays: existing?.carryOverDays || 0,
              currentUsed: existing?.usedDays || 0,
              customMaxCarry: lt.maxCarryOver,
              totalCapLimit: setting.totalCap,
            });

            await tx.leaveQuota.upsert({
              where: {
                employeeId_leaveTypeId_year: {
                  employeeId: emp.id,
                  leaveTypeId: lt.id,
                  year: targetYear,
                },
              },
              update: { totalDays: finalBase },
              create: {
                employeeId: emp.id,
                leaveTypeId: lt.id,
                year: targetYear,
                totalDays: finalBase,
                carryOverDays: finalCarry,
                usedDays: 0,
              },
            });
            updatedCount++;
          }
        }

        // ✅ บันทึก Audit Log (1 Log ต่อ 1 การอัปเดตทั้งบริษัท)
        await tx.auditLog.create({
          data: {
            action: "UPDATE",
            modelName: "LeaveQuota",
            recordId: targetYear, // ใช้ปีที่อัปเดตเป็น recordId อ้างอิง
            performedById: hrId,
            details: `Bulk update company quotas for year ${targetYear}. Affected employees: ${employees.length}`,
            newValue: {
              quotasSent: quotas, // ยอดวันลาพื้นฐานที่ตั้งค่ามา
              configsUsed: configs, // เพดาน (Cap) ที่ใช้คำนวณ
              onlyActiveOnly: onlyActive,
            },
            ipAddress: req.ip,
            userAgent: req.get("User-Agent"),
          },
        });

        return { updatedCount, employeeCount: employees.length };
      },
      {
        timeout: 30000, // เพิ่ม timeout เพราะเป็น bulk operation
      }
    );

    res.json({
      message: `Updated quotas for ${targetYear} successfully using Capped Logic.`,
      ...result,
    });
  } catch (error) {
    console.error("updateCompanyQuotasByType error:", error);
    res.status(400).json({ error: error.message });
  }
};

// 7) HR: ปรับโควต้า "พนักงานคนเดียว" แยกประเภท (หลายประเภทพร้อมกัน)
exports.updateEmployeeQuotasByType = async (req, res) => {
  try {
    const employeeId = parseInt(req.params.employeeId, 10);
    const { quotas, year, configs = {} } = req.body;
    const hrId = req.user.id; // ดึง ID ของ HR ผู้กระทำการ

    if (!Number.isFinite(employeeId) || employeeId <= 0) {
      throw new Error("Invalid employee ID");
    }

    let targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
    if (targetYear > 2500) targetYear -= 543;

    const normalized = normalizeQuotas(quotas);
    const typeNames = Object.keys(normalized);

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!employee) throw new Error("Employee not found.");

    const leaveTypes = await getLeaveTypesByNames(typeNames);

    const result = await prisma.$transaction(async (tx) => {
      let updatedCount = 0;

      for (const lt of leaveTypes) {
        const key = lt.typeName.toUpperCase();
        let newBase = Number(normalized[key] || 0);

        const setting = configs[key] || {
          totalCap: key === "ANNUAL" ? 12 : 999,
        };

        const existing = await tx.leaveQuota.findUnique({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId,
              leaveTypeId: lt.id,
              year: targetYear,
            },
          },
        });

        const currentUsed = existing ? Number(existing.usedDays || 0) : 0;
        const currentCarry = existing ? Number(existing.carryOverDays || 0) : 0;
        const currentTotal = existing ? Number(existing.totalDays || 0) : 0;

        // ✅ 2. คำนวณ Safe Base
        let safeBase = newBase;
        if (safeBase + currentCarry > setting.totalCap) {
          safeBase = Math.max(setting.totalCap - currentCarry, 0);
        }
        if (safeBase + currentCarry < currentUsed) {
          safeBase = Math.max(currentUsed - currentCarry, 0);
        }

        // 3. ดำเนินการอัปเดต
        const updatedQuota = await tx.leaveQuota.upsert({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId,
              leaveTypeId: lt.id,
              year: targetYear,
            },
          },
          update: { totalDays: safeBase },
          create: {
            employeeId,
            leaveTypeId: lt.id,
            year: targetYear,
            totalDays: safeBase,
            carryOverDays: 0,
            usedDays: 0,
          },
        });

        // ✅ 4. บันทึก Audit Log รายบุคคล (เฉพาะกรณีที่ค่ามีการเปลี่ยนแปลงจริง)
        if (currentTotal !== safeBase) {
          await tx.auditLog.create({
            data: {
              action: "UPDATE",
              modelName: "LeaveQuota",
              recordId: updatedQuota.id,
              performedById: hrId,
              details: `HR updated ${lt.typeName} quota for ${employee.firstName} ${employee.lastName} (${targetYear})`,
              oldValue: { totalDays: currentTotal },
              newValue: { totalDays: safeBase },
              ipAddress: req.ip,
              userAgent: req.get("User-Agent"),
            },
          });
        }

        updatedCount++;
      }

      return { updatedCount };
    });

    res.json({
      message: `Quotas for ${targetYear} updated successfully.`,
      employeeId,
      year: targetYear,
      ...result,
    });
  } catch (error) {
    console.error("updateEmployeeQuotasByType error:", error);
    res.status(400).json({ error: error.message });
  }
};

// ดึงสถานะการปิดงวดทั้งหมด
exports.getSystemConfigs = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const configs = await prisma.systemConfig.findMany({
      orderBy: { year: "desc" },
    });

    // ถ้ายังไม่มี Config ของปีปัจจุบัน ให้ถือว่าเปิดงวดไว้ก่อน
    const hasCurrentYear = configs.some((c) => c.year === currentYear);

    res.json({
      configs,
      serverYear: currentYear,
      isCurrentYearConfigured: hasCurrentYear,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ยกเลิกการปิดงวด (Re-open Year)
exports.reopenYear = async (req, res) => {
  try {
    const { year, reason } = req.body; // 💡 รับเหตุผลเพิ่มเข้ามา
    const targetYear = parseInt(year, 10);
    const hrId = req.user.id;

    if (!targetYear) {
      return res.status(400).json({ error: "Please specify a valid year." });
    }

    if (!reason || reason.trim().length < 5) {
      return res
        .status(400)
        .json({
          error: "Please provide a valid reason for re-opening the year.",
        });
    }

    // เริ่ม Transaction เพื่อความปลอดภัย
    const result = await prisma.$transaction(async (tx) => {
      // 1. เช็คว่ามีข้อมูลปีนี้อยู่จริงไหม
      const existing = await tx.systemConfig.findUnique({
        where: { year: targetYear },
      });

      if (!existing) {
        throw new Error(`Config for year ${targetYear} not found.`);
      }

      if (!existing.isClosed) {
        throw new Error(`Year ${targetYear} is already open.`);
      }

      // 2. อัปเดตสถานะ
      const updated = await tx.systemConfig.update({
        where: { year: targetYear },
        data: {
          isClosed: false,
          closedAt: null,
          // เราอาจจะเพิ่มฟิลด์เพื่อเก็บว่าใครเป็นคนเปิดล่าสุดได้ที่นี่ด้วย
        },
      });

      // 3. บันทึก Audit Log (สำคัญมาก)
      await tx.auditLog.create({
        data: {
          action: "UPDATE", // หรือ "SYSTEM_UNLOCK"
          modelName: "SystemConfig",
          recordId: targetYear,
          performedById: hrId,
          details: `HR re-opened year ${targetYear}. Reason: ${reason}`,
          oldValue: { isClosed: true, closedAt: existing.closedAt },
          newValue: { isClosed: false, closedAt: null },
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        },
      });

      return updated;
    });

    res.json({
      message: `Year ${targetYear} has been re-opened for editing.`,
      data: result,
    });
  } catch (error) {
    console.error("reopenYear Error:", error);
    res
      .status(400)
      .json({ error: error.message || "Failed to re-open the fiscal year." });
  }
};
