// backend/src/controllers/leaveController.js

const prisma = require("../config/prisma");
const { calculateTotalDays } = require("../utils/leaveHelpers");

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
    const formattedLeaves = leaves.map((l) => ({
      id: l.id,
      typeName: l.leaveType?.typeName,
      startDate: l.startDate,
      endDate: l.endDate,
      totalDaysRequested: Number(l.totalDaysRequested),
      status: l.status,
      reason: l.reason,
      requestedAt: l.requestedAt,
      approverName: l.approvedByHr
        ? `${l.approvedByHr.firstName} ${l.approvedByHr.lastName}`
        : l.status === "Pending"
        ? "Waiting for HR"
        : "-",
      attachmentUrl: l.attachmentUrl
        ? `${process.env.BASE_URL || ""}${l.attachmentUrl}`
        : null,
    }));

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
    const { type, startDate, endDate, reason, startDuration, endDuration } =
      req.body;
    const userId = req.user.id;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const year = start.getFullYear();

    // 1. ตรวจสอบสถานะปี (Locked/Open)
    const config = await prisma.systemConfig.findUnique({ where: { year } });
    if (config?.isClosed) {
      return res
        .status(403)
        .json({ error: `System for ${year} is locked for processing.` });
    }

    // 2. Validate วันที่เบื้องต้น
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Incorrect date format." });
    }
    if (start > end) {
      return res
        .status(400)
        .json({ error: "Start date cannot be after end date." });
    }

    const leaveType = await prisma.leaveType.findUnique({
      where: { typeName: type },
    });
    if (!leaveType)
      return res.status(400).json({ error: "Leave type not found." });

    // 3. ดึงวันหยุดและจัดการเรื่อง Timezone ให้เป็น Local Date (YYYY-MM-DD)
    const holidays = await prisma.holiday.findMany({
      where: { date: { gte: start, lte: end } },
      select: { date: true },
    });

    const holidayDates = holidays.map((h) => {
      const d = new Date(h.date);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    });

    // 4. คำนวณวันลาจริง
    const totalDaysRequested = calculateTotalDays(
      start,
      end,
      startDuration,
      endDuration,
      holidayDates
    );

    // 5. ตรวจสอบวันหยุด "ก่อน" เข้าไปเช็คโควต้าใน DB
    // หากกดลาเฉพาะวันหยุด ระบบจะหยุดที่นี่ทันที
    if (totalDaysRequested <= 0) {
      return res.status(400).json({
        error:
          "ไม่สามารถส่งคำขอลาได้ เนื่องจากวันที่คุณเลือกเป็นวันเสาร์-อาทิตย์ หรือวันหยุดนักขัตฤกษ์ทั้งหมด",
      });
    }

    // 6. ตรวจสอบเงื่อนไขลาติดต่อกันสูงสุด
    const maxConsecutive = Number(leaveType.maxConsecutiveDays ?? 0);
    if (maxConsecutive > 0 && totalDaysRequested > maxConsecutive) {
      return res.status(400).json({
        error: `You cannot take ${type} leave for more than ${maxConsecutive} consecutive days.`,
      });
    }

    const attachmentUrl = req.file
      ? `/uploads/leaves/${req.file.filename}`
      : null;

    // 7. Database Transaction
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

      // ตรวจสอบโควต้าคงเหลือ
      const quota = await tx.leaveQuota.findUnique({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: userId,
            leaveTypeId: leaveType.id,
            year,
          },
        },
      });

      // ถ้าไม่มีโควต้าแถวนี้ใน DB จริงๆ ค่อยแจ้งเตือน
      if (!quota)
        throw new Error(
          `No leave quota found for ${type} in ${year}. Please contact HR.`
        );
      const remaining =
        Number(quota.totalDays) +
        Number(quota.carryOverDays || 0) -
        Number(quota.usedDays);

      if (remaining < totalDaysRequested) {
        throw new Error(
          `Insufficient balance. You have ${remaining} days left.`
        );
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

      // ระบบแจ้งเตือน HR
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

    // 8. Real-time Notification
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

    res
      .status(201)
      .json({ message: "Request submitted.", data: result.newLeave });
  } catch (error) {
    console.error("CreateLeaveRequest Error:", error);
    res.status(400).json({ error: error.message });
  }
};

exports.cancelLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const leaveId = parseInt(id, 10);

    if (!leaveId) return res.status(400).json({ error: "Invalid leave ID" });

    // 1. ดึงข้อมูลมาเช็คเบื้องต้นนอก Transaction
    const request = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: { leaveType: true },
    });

    if (!request) throw new Error("Leave request not found.");
    if (request.employeeId !== userId) throw new Error("Unauthorized.");

    // ✅ ตรวจสอบ: ห้ามยกเลิกย้อนหลังหรือใบลาที่เริ่มลาไปแล้ววันนี้
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(request.startDate);
    if (startDate <= today) {
      throw new Error(
        "Cannot cancel/withdraw leave that has already started or passed."
      );
    }

    // ✅ ตรวจสอบสถานะที่อนุญาต
    if (!["Pending", "Approved"].includes(request.status)) {
      throw new Error(`Cannot cancel a request with status: ${request.status}`);
    }

    const result = await prisma.$transaction(async (tx) => {
      let targetStatus = "Cancelled"; // Default สำหรับ Pending
      let messageToHr = `Employee cancelled their ${request.leaveType.typeName} leave (Pending).`;

      // ✅ 2. ถ้าสถานะคือ Approved ต้องเปลี่ยนเป็น 'Withdraw_Pending' เพื่อรอ HR อนุมัติการยกเลิก
      if (request.status === "Approved") {
        targetStatus = "Withdraw_Pending";
        messageToHr = `Employee requested to WITHDRAW their approved ${request.leaveType.typeName} leave. Please review.`;
      }

      // 3. อัปเดตสถานะใบลา
      const updatedRequest = await tx.leaveRequest.update({
        where: { id: leaveId },
        data: {
          status: targetStatus,
          // หากเป็น Cancelled ทันที ให้ลบไฟล์ได้เลย แต่ถ้า Withdraw_Pending ให้เก็บไฟล์ไว้ก่อนจนกว่า HR จะอนุมัติ
          attachmentUrl:
            targetStatus === "Cancelled" ? null : request.attachmentUrl,
        },
      });

      // 4. แจ้งเตือน HR
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

      return {
        updatedRequest,
        oldAttachment:
          targetStatus === "Cancelled" ? request.attachmentUrl : null,
      };
    });

    // --- 5. ลบไฟล์จริง (เฉพาะกรณีที่กลายเป็น Cancelled ทันที) ---
    if (result.oldAttachment) {
      const fileName = path.basename(result.oldAttachment);
      const fullPath = path.join(process.cwd(), "uploads", "leaves", fileName);
      if (fs.existsSync(fullPath)) {
        fs.unlink(fullPath, (err) => {
          if (err) console.error(`❌ Delete error: ${fullPath}`, err);
        });
      }
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
                carryOverDays: true,
              },
            },
          },
        },
        leaveType: true,
      },
      orderBy: { requestedAt: "asc" },
    });

    // ✅ ปรับ Format ข้อมูลเล็กน้อยเพื่อให้หน้าบ้านแสดงผล "โควต้าคงเหลือ" ของประเภทที่ลาได้ทันที
    const formattedRequests = requests.map((req) => {
      const quotaForThisType = req.employee.leaveQuotas.find(
        (q) => q.leaveTypeId === req.leaveTypeId
      );

      return {
        ...req,
        quotaInfo: quotaForThisType
          ? {
              remaining:
                parseFloat(quotaForThisType.totalDays) +
                parseFloat(quotaForThisType.carryOverDays || 0) -
                parseFloat(quotaForThisType.usedDays),
              total:
                parseFloat(quotaForThisType.totalDays) +
                parseFloat(quotaForThisType.carryOverDays || 0),
            }
          : null,
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
    // 1. รับ Query 'hrAction' เพื่อใช้กรองดูเฉพาะรายการที่ HR คนนั้นๆ เป็นคนจัดการเอง
    const { status, year, employeeName, hrAction } = req.query;

    const where = {};
    if (status) where.status = status;

    if (year) {
      const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
      const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);
      where.startDate = { gte: startOfYear, lte: endOfYear };
    }

    if (employeeName) {
      where.employee = {
        OR: [
          { firstName: { contains: employeeName, mode: "insensitive" } },
          { lastName: { contains: employeeName, mode: "insensitive" } },
        ],
      };
    }

    // ถ้าส่ง hrAction=true มา ให้กรองเฉพาะรายการที่ User คนนี้เป็นคน Approve/Reject
    if (hrAction === "true") {
      where.approvedByHrId = req.user.id;
    }

    const holidays = await prisma.holiday.findMany({ select: { date: true } });
    const holidayDates = holidays.map(
      (h) => h.date.toISOString().split("T")[0]
    );

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: { select: { firstName: true, lastName: true, role: true } },
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
        name: `${l.employee.firstName} ${l.employee.lastName}`,
        type: l.leaveType.typeName,
        startDate: l.startDate,
        endDate: l.endDate,
        totalDays: Number(l.totalDaysRequested),
        status: l.status,
        reason: l.reason,
        attachmentUrl: l.attachmentUrl,
        requestedAt: l.requestedAt,

        // ข้อมูลสำหรับการย้อนดูประวัติ HR
        approverName: l.approvedByHr
          ? `${l.approvedByHr.firstName} ${l.approvedByHr.lastName}`
          : null,
        approvalDate: l.approvalDate, // วันที่ HR กดจัดการ
        isSpecialApproved: l.isSpecialApproved, // บอกว่าเป็นเคสพิเศษหรือไม่

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
    const { id, status, isSpecial } = req.body; // status ที่ส่งมาคือ 'Approved' หรือ 'Rejected'
    const hrId = req.user.id;
    const leaveId = parseInt(id, 10);

    if (!leaveId) return res.status(400).json({ error: "Invalid leave ID" });

    let fileToDelete = null;

    const result = await prisma.$transaction(async (tx) => {
      // 1. ดึงข้อมูลใบลามาตรวจสอบ
      const request = await tx.leaveRequest.findUnique({
        where: { id: leaveId },
        include: { leaveType: true },
      });

      if (!request) throw new Error("Leave request not found.");

      const currentStatus = request.status;
      let finalStatus = status;
      let actionType = "";

      // --- 💡 กรณีที่ 1: จัดการคำขอถอนใบลา (Withdraw_Pending) ---
      if (currentStatus === "Withdraw_Pending") {
        if (status === "Approved") {
          // HR อนุมัติการถอน -> กลายเป็น Cancelled และคืนโควต้า
          finalStatus = "Cancelled";
          actionType = "WITHDRAW_APPROVED";
          fileToDelete = request.attachmentUrl; // เตรียมลบไฟล์

          if (!request.isSpecialApproved) {
            await tx.leaveQuota.update({
              where: {
                employeeId_leaveTypeId_year: {
                  employeeId: request.employeeId,
                  leaveTypeId: request.leaveTypeId,
                  year: request.startDate.getFullYear(),
                },
              },
              data: { usedDays: { decrement: request.totalDaysRequested } },
            });
          }
        } else {
          // HR ปฏิเสธการถอน -> กลับไปเป็น Approved เหมือนเดิม
          finalStatus = "Approved";
          actionType = "WITHDRAW_REJECTED";
        }
      }

      // --- 💡 กรณีที่ 2: จัดการใบลาใหม่ (Pending) ---
      else if (currentStatus === "Pending") {
        actionType =
          status === "Approved" ? "LEAVE_APPROVED" : "LEAVE_REJECTED";
        if (status === "Rejected") fileToDelete = request.attachmentUrl;

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
      } else {
        throw new Error(
          "This request cannot be updated in its current status."
        );
      }

      // 2. อัปเดตสถานะใบลา
      const updatedRequest = await tx.leaveRequest.update({
        where: { id: leaveId },
        data: {
          status: finalStatus,
          approvedByHrId: hrId,
          approvalDate: new Date(),
          isSpecialApproved:
            currentStatus === "Pending" && finalStatus === "Approved"
              ? isSpecial || false
              : request.isSpecialApproved,
          attachmentUrl:
            finalStatus === "Cancelled" || finalStatus === "Rejected"
              ? null
              : request.attachmentUrl,
        },
      });

      // 3. สร้างการแจ้งเตือน
      let notifyMsg = `Your ${
        request.leaveType.typeName
      } request has been ${finalStatus.toLowerCase()}.`;
      if (actionType === "WITHDRAW_APPROVED")
        notifyMsg = `Your withdrawal request for ${request.leaveType.typeName} has been approved. Quota refunded.`;
      if (actionType === "WITHDRAW_REJECTED")
        notifyMsg = `Your withdrawal request for ${request.leaveType.typeName} was rejected. Leave remains active.`;

      const newNotification = await tx.notification.create({
        data: {
          employeeId: request.employeeId,
          notificationType:
            finalStatus === "Approved" ? "Approval" : "Rejection",
          message: notifyMsg,
          relatedRequestId: request.id,
        },
      });

      const unreadCount = await tx.notification.count({
        where: { employeeId: request.employeeId, isRead: false },
      });

      return { updatedRequest, newNotification, unreadCount, actionType };
    });

    // --- 4. ลบไฟล์จริงออกจาก Disk (ทำนอก Transaction) ---
    if (fileToDelete) {
      const fileName = path.basename(fileToDelete);
      const fullPath = path.join(process.cwd(), "uploads", "leaves", fileName);
      if (fs.existsSync(fullPath)) {
        fs.unlink(fullPath, (err) => {
          if (err) console.error("❌ File delete error:", err);
        });
      }
    }

    // 5. Socket.io Notification
    const io = req.app.get("io");
    if (io) {
      io.to(`user_${result.updatedRequest.employeeId}`).emit(
        "new_notification",
        {
          message: result.newNotification.message,
          unreadCount: result.unreadCount,
        }
      );
    }

    res.json({
      message: `Action: ${result.actionType}`,
      data: result.updatedRequest,
    });
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

    if (!tYear || isNaN(tYear)) throw new Error("Invalid targetYear.");

    const result = await prisma.$transaction(async (tx) => {
      // 1. ตรวจสอบสถานะปีเก่า
      const configOld = await tx.systemConfig.findUnique({
        where: { year: lastYear },
      });
      if (configOld?.isClosed)
        throw new Error(`Year ${lastYear} is already closed.`);

      // 2. ดึงพนักงานและประเภทวันลา
      const allEmployees = await tx.employee.findMany({
        where: { isActive: true },
      });
      const leaveTypes = await tx.leaveType.findMany();

      let processedCount = 0;

      for (const emp of allEmployees) {
        for (const type of leaveTypes) {
          const typeName = type.typeName.toUpperCase();
          const setting = carryConfigs[typeName] || {
            maxCarry: 0,
            totalCap: 999,
          };

          // ดึงโควต้าปีเก่า
          const oldQuota = await tx.leaveQuota.findUnique({
            where: {
              employeeId_leaveTypeId_year: {
                employeeId: emp.id,
                leaveTypeId: type.id,
                year: lastYear,
              },
            },
          });

          // คำนวณวันคงเหลือจากปีเก่า
          let rawCarry = 0;
          if (oldQuota) {
            const remaining =
              Number(oldQuota.totalDays) +
              Number(oldQuota.carryOverDays) -
              Number(oldQuota.usedDays);
            rawCarry = Math.max(remaining, 0);
          }

          // ในที่นี้ newBase คือค่าที่ HR ส่งมาจากหน้าบ้าน (quotas[typeName])
          const { finalBase, finalCarry } = validateAndApplyQuotaCaps({
            typeName: typeName,
            totalDays: Number(quotas[typeName] || 0),
            carryOverDays: rawCarry,
            hrMaxCarry: setting.maxCarry, // เพดานการทบ
            hrTotalCap: setting.totalCap, // เพดานยอดรวม (Base + Carry)
          });

          // 5. บันทึกโควต้าปีใหม่
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

      // 6. ปิดงวดปีเก่า และ เปิดงวดปีใหม่
      await tx.systemConfig.upsert({
        where: { year: lastYear },
        update: {
          isClosed: true,
          closedAt: new Date(),
          processedBy: req.user.id,
        },
        create: {
          year: lastYear,
          isClosed: true,
          closedAt: new Date(),
          processedBy: req.user.id,
        },
      });

      await tx.systemConfig.upsert({
        where: { year: tYear },
        update: { isClosed: false },
        create: { year: tYear, isClosed: false },
      });

      // 7. สร้าง Notification สรุป (ใช้ createMany เพื่อ Performance)
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

// 6. HR: ปรับโควต้า "ทั้งบริษัท" แยกประเภท (หลายประเภทพร้อมกัน)
exports.updateCompanyQuotasByType = async (req, res) => {
  try {
    const { quotas, year, onlyActive, configs = {} } = req.body;

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

            // ดึงข้อมูลปัจจุบัน
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

            // ✅ เรียกใช้ฟังก์ชันใหม่ที่เปลี่ยนชื่อแล้ว
            const { finalBase, finalCarry } = validateAndApplyQuotaCaps({
              typeName: lt.typeName,
              totalDays: normalized[typeName],
              carryOverDays: existing?.carryOverDays || 0,
              currentUsed: existing?.usedDays || 0, // ✅ เพิ่มความปลอดภัย
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
        return { updatedCount, employeeCount: employees.length };
      },
      {
        timeout: 30000,
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

    if (!Number.isFinite(employeeId) || employeeId <= 0) {
      throw new Error("Invalid employee ID");
    }

    // ✅ 1. Normalization เรื่องปี (พ.ศ. -> ค.ศ.)
    let targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
    if (targetYear > 2500) targetYear -= 543;

    const normalized = normalizeQuotas(quotas);
    const typeNames = Object.keys(normalized);

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true },
    });
    if (!employee) throw new Error("Employee not found.");

    const leaveTypes = await getLeaveTypesByNames(typeNames);

    const result = await prisma.$transaction(async (tx) => {
      let updatedCount = 0;

      for (const lt of leaveTypes) {
        const key = lt.typeName.toUpperCase();
        let newBase = Number(normalized[key] || 0);

        // ดึงนโยบายบริษัท (ถ้าไม่มีใน body ให้ลองนึกถึง Policy มาตรฐาน)
        const setting = configs[key] || {
          totalCap: key === "ANNUAL" ? 12 : 999, // ตัวอย่าง: ANNUAL ห้ามเกิน 12
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

        // ✅ 2. คำนวณ Safe Base
        let safeBase = newBase;

        // Step A: เช็ค Total Cap (Base + Carry ต้องไม่เกินเพดาน)
        if (safeBase + currentCarry > setting.totalCap) {
          safeBase = Math.max(setting.totalCap - currentCarry, 0);
        }

        // Step B: เช็ค Used Protection (Base + Carry ต้องไม่น้อยกว่าที่ลาไปแล้ว)
        // ถ้าลาไปแล้ว 5 วัน แต่ HR จะลดเหลือ 3 วัน ระบบจะบังคับให้ต่ำสุดคือ 5 วัน
        if (safeBase + currentCarry < currentUsed) {
          safeBase = Math.max(currentUsed - currentCarry, 0);
        }

        await tx.leaveQuota.upsert({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId,
              leaveTypeId: lt.id,
              year: targetYear,
            },
          },
          update: {
            totalDays: safeBase,
            // ไม่ต้องแก้ carryOver/usedDays เพราะเป็นการแก้โควต้าหลัก
          },
          create: {
            employeeId,
            leaveTypeId: lt.id,
            year: targetYear,
            totalDays: safeBase,
            carryOverDays: 0, // สำหรับคนใหม่ที่ยังไม่มี Record
            usedDays: 0,
          },
        });

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
    const { year } = req.body;
    const targetYear = parseInt(year, 10);

    if (!targetYear) {
      return res.status(400).json({ error: "Please specify a valid year." });
    }

    // เช็คว่ามีข้อมูลปีนี้อยู่จริงไหม
    const existing = await prisma.systemConfig.findUnique({
      where: { year: targetYear },
    });

    if (!existing) {
      return res
        .status(404)
        .json({ error: `Config for year ${targetYear} not found.` });
    }

    const updated = await prisma.systemConfig.update({
      where: { year: targetYear },
      data: {
        isClosed: false,
        closedAt: null,
      },
    });

    res.json({
      message: `Year ${targetYear} has been re-opened for editing.`,
      data: updated,
    });
  } catch (error) {
    console.error("reopenYear Error:", error);
    res.status(500).json({ error: "Failed to re-open the fiscal year." });
  }
};
