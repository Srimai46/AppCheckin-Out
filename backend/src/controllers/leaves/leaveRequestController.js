// backend/src/controllers/leaves/leaveRequestController.js

const fs = require("fs");
const path = require("path");
const prisma = require('../../config/prisma'); 
const { auditLog } = require("../../utils/logger");
const { calculateTotalDays, getWorkingDaysList } = require("../../utils/leaveHelpers");

exports.createLeaveRequest = async (req, res) => {
  try {
    const { type, startDate, endDate, reason, startDuration, endDuration } = req.body;
    const userId = req.user.id;

    // 0. ดึงข้อมูลคนทำรายการ (เพื่อเอาชื่อไปใส่ Socket/Log)
    const requesterUser = await prisma.employee.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true }
    });

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
      return res.status(400).json({ error: "Cannot request leave as the selected dates are all holidays." });
    }

    // 6. ตรวจสอบเงื่อนไขลาติดต่อกัน (Custom Consecutive Limit)
    // ถ้าเป็น 0 หรือ null แปลว่า "ไม่จำกัด" (Unlimited)
    const maxConsecutive = leaveType.maxConsecutiveDays ? Number(leaveType.maxConsecutiveDays) : 0;
    
    if (maxConsecutive > 0 && totalDaysRequested > maxConsecutive) {
      return res.status(400).json({ 
        error: `Policy Violation: You cannot take "${type}" for more than ${maxConsecutive} consecutive working days.` 
      });
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

      // Special Type อาจไม่มี Quota ปกติ (ข้ามการเช็คได้ถ้าต้องการ หรือต้องมี Quota 0)
      if (type !== "Special") {
         if (!quota) throw new Error(`No leave quota found for ${type} in ${year}.`);

         const remaining = Number(quota.totalDays) + Number(quota.carryOverDays || 0) - Number(quota.usedDays);
         if (remaining < totalDaysRequested) {
           throw new Error(`Insufficient balance. You have ${remaining} days left.`);
         }
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

      // จัด Format Log ให้สวยงาม (Clean Data)
      const cleanNewValue = {
          requestId: newLeave.id,
          type: type,
          from: start.toISOString().split('T')[0],
          to: end.toISOString().split('T')[0],
          days: totalDaysRequested,
          reason: reason,
          status: "Pending"
      };

      const auditDetails = `Submitted ${type} request (${totalDaysRequested} days)`;

      // 7.2 บันทึก Audit Log ลง DB
      await auditLog(tx, {
        action: "CREATE",
        modelName: "LeaveRequest",
        recordId: newLeave.id,
        userId: userId,
        details: auditDetails,
        newValue: cleanNewValue, // 🔥 ใช้ข้อมูลที่จัด Format แล้ว
        req: req,
      });

      // 8. เตรียมข้อมูลแจ้งเตือน HR
      const admins = await tx.employee.findMany({
        where: { role: "HR", id: { not: userId } },
        select: { id: true },
      });

      const totalPendingCount = await tx.leaveRequest.count({
        where: { status: { in: ["Pending", "Withdraw_Pending"] } }
      });

      const fullName = `${newLeave.employee.firstName} ${newLeave.employee.lastName}`;
      const notificationMsg = `${fullName} requested ${type} leave for ${totalDaysRequested} days.`;

      const adminUpdates = [];
      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            employeeId: admin.id,
            notificationType: "NewRequest",
            message: notificationMsg,
            relatedRequestId: newLeave.id,
          })),
        });

        // เตรียมข้อมูลส่ง Socket ให้ Admin แต่ละคน
        for (const admin of admins) {
           const count = await tx.notification.count({
             where: { employeeId: admin.id, isRead: false },
           });
           adminUpdates.push({ adminId: admin.id, unreadCount: count });
        }
      }

      return { 
          newLeave, 
          cleanNewValue, // ส่งกลับไปใช้ใน Socket
          adminUpdates, 
          message: notificationMsg, 
          totalPendingCount, 
          auditDetails 
      };
    });

    // 🚀 8. Real-time Notification & Audit Log
    const io = req.app.get("io");
    if (io) {
      // 8.1 ส่งอัปเดต Badge ให้ HR
      io.to("hr_group").emit("update_pending_count", {
        count: result.totalPendingCount,
        message: result.message
      });

      // 8.2 ส่งแจ้งเตือนรายบุคคล (กระดิ่ง)
      if (result.adminUpdates.length > 0) {
        result.adminUpdates.forEach((update) => {
          io.to(`user_${update.adminId}`).emit("new_notification", {
            message: result.message,
            notificationType: "NewRequest",
            unreadCount: update.unreadCount,
          });
        });
      }

      // 8.3 ส่ง Real-time Audit Log
      io.emit("new-audit-log", {
        id: Date.now(),
        action: "CREATE", // สีเขียว
        modelName: "LeaveRequest",
        recordId: result.newLeave.id,
        performedBy: {
            // ใช้ชื่อจริงจาก DB ที่ดึงมาตอนต้น
            firstName: requesterUser?.firstName || "Unknown",
            lastName: requesterUser?.lastName || ""
        },
        details: result.auditDetails,
        newValue: result.cleanNewValue, // ส่งข้อมูลสวยๆ ให้ Frontend
        createdAt: new Date()
      });
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
        messageToHr = `${request.employee.firstName} requested to WITHDRAW approved ${request.leaveType.typeName} leave. Reason: ${cancelReason || 'Not specified'}`;
      }

      // 4. อัปเดตสถานะใบลา
      const updatedRequest = await tx.leaveRequest.update({
        where: { id: leaveId },
        data: {
          status: targetStatus,
          cancelReason: cancelReason || null, 
          attachmentUrl: targetStatus === "Cancelled" ? null : request.attachmentUrl,
        },
      });

      // 5. บันทึก Audit Log ลง Database
      await tx.auditLog.create({
        data: {
          action: targetStatus === "Cancelled" ? "DELETE" : "UPDATE", // บันทึกลง DB ตามความจริง
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

      // 6. แจ้งเตือน HR (Database)
      const admins = await tx.employee.findMany({
        where: { role: "HR" },
        select: { id: true },
      });

      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            employeeId: admin.id,
            notificationType: "NewRequest", // หรือสร้าง Type ใหม่เช่น CancelRequest
            message: messageToHr,
            relatedRequestId: leaveId,
          })),
        });
      }

      // 7. นับยอดงานค้างทั้งหมดใหม่
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
        adminUpdates,
        targetStatus // ส่ง status ออกมาด้วยเพื่อใช้ตัดสินใจสีของ Log
      };
    });

    // 8. ลบไฟล์จริง (เฉพาะกรณี Cancelled)
    if (result.oldAttachment) {
      const fileName = path.basename(result.oldAttachment);
      const fullPath = path.join(process.cwd(), "uploads", "leaves", fileName);
      if (fs.existsSync(fullPath)) {
        fs.unlink(fullPath, (err) => { if (err) console.error(`❌ Delete error: ${fullPath}`, err); });
      }
    }

    // 🚀 9. Real-time Notification & Audit Log
    const io = req.app.get("io");
    if (io) {
      // 9.1 อัปเดตยอด Badge ของ HR
      io.to("hr_group").emit("update_pending_count", {
        count: result.totalPendingCount,
        message: result.messageToHr
      });

      // 9.2 แจ้งเตือนกระดิ่ง
      result.adminUpdates.forEach((update) => {
        io.to(`user_${update.adminId}`).emit("new_notification", {
          message: result.messageToHr,
          unreadCount: update.unreadCount,
          notificationType: "NewRequest"
        });
      });

      // ============================================================
      // ✅ 9.3 ส่ง Real-time Audit Log (เพื่อให้หน้าจอเด้ง)
      // ============================================================
      // ถ้า Cancelled ให้ใช้ DELETE (สีแดง), ถ้า Withdraw ให้ใช้ UPDATE (สีส้ม)
      const socketAction = result.targetStatus === "Cancelled" ? "DELETE" : "UPDATE";

      io.emit("new-audit-log", {
        id: Date.now(),
        action: socketAction, 
        modelName: "LeaveRequest",
        recordId: result.updatedRequest.id,
        performedBy: {
            firstName: req.user.firstName,
            lastName: req.user.lastName
        },
        details: result.messageToHr,
        createdAt: new Date()
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
        reason: l.reason,
        rejectionReason: l.rejectionReason, 
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
    const holidayDates = holidays.map((h) =>
      new Date(h.date).toLocaleDateString("en-CA")
    );

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, role: true, email: true },
        },
        leaveType: { select: { typeName: true } },

        // ✅ ต้อง include เพื่อเอาชื่อ HR
        approvedByHr: { select: { firstName: true, lastName: true } },
      },
      orderBy: { requestedAt: "desc" },
    });

    const result = leaves.map((l) => {
      const workingDays = getWorkingDaysList(l.startDate, l.endDate, holidayDates);

      const hrFullName = l.approvedByHr
        ? `${l.approvedByHr.firstName} ${l.approvedByHr.lastName}`.trim()
        : null;

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
        reason: l.reason,
        rejectionReason: l.rejectionReason,
        cancelReason: l.cancelReason,
        attachmentUrl: l.attachmentUrl,
        requestedAt: l.requestedAt,

        // ✅ “คนที่ทำรายการล่าสุด” (Approve/Reject/Cancel) อิง HrId เดิม
        actedByHrId: l.approvedByHrId || null,
        actedByHrName: hrFullName,

        // ✅ ทำให้ FE แสดง "Approved By / Rejected By" ได้ตรงๆ
        approvedBy: l.status === "Approved" ? hrFullName : null,
        rejectedBy: l.status === "Rejected" ? hrFullName : null,

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

        // ✅ เพิ่มเพื่อให้ response มีชื่อ HR ถ้า request เคยถูก action
        approvedByHr: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { requestedAt: "asc" },
    });

    const formattedRequests = requests.map((leave) => {
      const quotaForThisType = leave.employee.leaveQuotas.find(
        (q) => q.leaveTypeId === leave.leaveTypeId
      );

      let quotaInfo = null;
      if (quotaForThisType) {
        const total =
          Number(quotaForThisType.totalDays) +
          Number(quotaForThisType.carryOverDays || 0);
        const used = Number(quotaForThisType.usedDays);
        quotaInfo = {
          total,
          used,
          remaining: total - used,
        };
      }

      const hrFullName = leave.approvedByHr
        ? `${leave.approvedByHr.firstName} ${leave.approvedByHr.lastName}`.trim()
        : null;

      return {
        ...leave,
        totalDaysRequested: Number(leave.totalDaysRequested),
        quotaInfo,

        cancelReason: leave.cancelReason,
        isWithdrawRequest: leave.status === "Withdraw_Pending",

        // ✅ ส่งชื่อ HR (ถ้ามี) เผื่อ FE ต้องใช้
        actedByHrId: leave.approvedByHrId || null,
        actedByHrName: hrFullName,
      };
    });

    res.json(formattedRequests);
  } catch (error) {
    console.error("getPendingRequests Error:", error);
    res.status(500).json({ error: "Failed to fetch pending requests." });
  }
};

exports.updateLeaveStatus = async (req, res) => {
  try {
    // 1. รับค่า (รวมเหตุผลการปฏิเสธ)
    const { id, status, isSpecial, rejectionReason } = req.body;
    if (status === "Rejected" && !String(rejectionReason || "").trim()) {
      throw new Error("Rejection reason is required.");
    }
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

      const detailsText = `HR ${auditAction} leave from ${currentStatus} to ${finalStatus}. ${rejectionReason ? `Reason: ${rejectionReason}` : ""}`;

      // 3. Audit Log ลง DB
      await auditLog(tx, {
        action: auditAction,
        modelName: "LeaveRequest",
        recordId: leaveId,
        userId: hrId,
        details: detailsText,
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

      return { updatedRequest, newNotification, unreadCount, auditAction, totalPendingCount, detailsText };
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
      // 6.1 แจ้งพนักงานเจ้าของใบลา
      io.to(`user_${result.updatedRequest.employeeId}`).emit("new_notification", {
        message: result.newNotification.message,
        unreadCount: result.unreadCount,
        type: result.auditAction,
        requestId: result.updatedRequest.id,
        newStatus: result.updatedRequest.status,
        rejectionReason: result.updatedRequest.rejectionReason
      });

      // 6.2 อัปเดตยอด Badge ของ HR
      io.to("hr_group").emit("update_pending_count", {
        count: result.totalPendingCount
      });

      // 6.3 ส่ง Real-time Audit Log (ส่วนที่เพิ่ม)
      
      // กำหนดสี: ถ้า Reject/Cancel ให้เป็นสีแดง (DELETE), ถ้า Approve ให้เป็นสีส้ม (UPDATE)
      let socketAction = "UPDATE";
      if (result.updatedRequest.status === "Rejected" || result.updatedRequest.status === "Cancelled") {
        socketAction = "DELETE"; 
      }

      io.emit("new-audit-log", {
        id: Date.now(),
        action: socketAction,
        modelName: "LeaveRequest",
        recordId: result.updatedRequest.id,
        performedBy: {
            firstName: req.user.firstName,
            lastName: req.user.lastName
        },
        details: result.detailsText, // ใช้ข้อความเดียวกับที่ลง DB
        createdAt: now
      });
    }

    const hrFullName = `${req.user.firstName} ${req.user.lastName}`.trim();

    res.json({
      message: `Success: ${result.auditAction}`,
      data: {
        ...result.updatedRequest,
        actedByHrId: req.user.id,
        actedByHrName: hrFullName,
        approvedBy: result.updatedRequest.status === "Approved" ? hrFullName : null,
        rejectedBy: result.updatedRequest.status === "Rejected" ? hrFullName : null,
      },
    });

  } catch (error) {
    console.error("UpdateLeaveStatus Error:", error);
    res.status(400).json({ error: error.message });
  }
};
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

      // 2. จัดการ Quota หมวด Special
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
            leaveTypeId: specialType.id,
            specialGrantId: grant.id,
            approvedByHrId: hrId,
            approvalDate: new Date(),
          },
        });
      }

      const logDetails = `HR granted ${amount} special days to Employee #${employeeId}. Reason: ${reason}`;

      // 4. บันทึก Audit Log ลง DB
      await tx.auditLog.create({
        data: {
          action: "CREATE", // หรือ "CREATE" ก็ได้ถ้าอยากให้เป็นสีเขียว
          modelName: "SpecialLeaveGrant",
          recordId: grant.id,
          performedById: hrId,
          details: logDetails,
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

      // 6. นับยอด Pending ใหม่
      const totalPendingCount = await tx.leaveRequest.count({
        where: { status: { in: ["Pending", "Withdraw_Pending"] } }
      });

      const unreadCount = await tx.notification.count({
        where: { employeeId: parseInt(employeeId), isRead: false }
      });

      return { updatedRequest, totalPendingCount, unreadCount, notification, logDetails, grantId: grant.id };
    });

    // 🚀 7. Real-time Notification & Audit Log
    const io = req.app.get("io");
    if (io) {
      // 7.1 ส่งถึงพนักงานคนนั้นโดยตรง
      io.to(`user_${employeeId}`).emit("new_notification", {
        message: result.notification.message,
        unreadCount: result.unreadCount,
        status: "Approved",
        isSpecial: true
      });

      // 7.2 ส่งถึงห้อง HR ทุกคนเพื่ออัปเดต Badge
      io.to("hr_group").emit("update_pending_count", {
        count: result.totalPendingCount
      });

      // 7.3 ส่ง Real-time Audit Log (ส่วนที่เพิ่ม)
      io.emit("new-audit-log", {
        id: Date.now(),
        action: "CREATE", // ใช้สีเขียว เพราะเป็นการให้สิทธิ์/อนุมัติ
        modelName: "SpecialLeaveGrant",
        recordId: result.grantId,
        performedBy: {
            firstName: req.user.firstName,
            lastName: req.user.lastName
        },
        details: result.logDetails,
        createdAt: new Date()
      });
    }

    res.json({ message: "Special Case processed and logged successfully.", data: result.updatedRequest });
  } catch (error) {
    console.error("grantSpecialLeave Error:", error);
    res.status(500).json({ error: error.message });
  }
};