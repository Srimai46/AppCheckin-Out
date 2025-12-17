const prisma = require("../config/prisma");

// ---------------------------------------------------------
// ส่วนของ Worker (พนักงานทั่วไป)
// ---------------------------------------------------------

exports.getMyQuotas = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const quotas = await prisma.leaveQuota.findMany({
      where: { employeeId: req.user.id, year: currentYear },
      include: { leaveType: true },
    });

    const result = quotas.map((q) => ({
      type: q.leaveType.typeName,
      total: Number(q.totalDays),
      used: Number(q.usedDays),
      remaining: Number(q.totalDays) - Number(q.usedDays),
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "ไม่สามารถดึงข้อมูลโควต้าได้" });
  }
};


exports.createLeaveRequest = async (req, res) => {
  try {
    const { type, startDate, endDate, reason, startDuration, endDuration } = req.body;
    const userId = req.user.id;
    const currentYear = new Date().getFullYear();

    // 1. หา leaveTypeId จากชื่อ type
    const leaveTypeRecord = await prisma.leaveType.findUnique({
      where: { typeName: type },
    });

    if (!leaveTypeRecord) {
      return res.status(400).json({ error: `ไม่พบประเภทการลา: ${type}` });
    }

    // 2. ตรวจสอบและคำนวณวันลา
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return res.status(400).json({ error: "วันที่เริ่มต้นต้องมาก่อนวันที่สิ้นสุด" });
    }

    // ✅ ป้องกันการลาทับซ้อนกัน (Overlap Validation)
    const overlap = await prisma.leaveRequest.findFirst({
      where: {
        employeeId: userId,
        status: { in: ['Pending', 'Approved'] },
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } }
        ]
      }
    });

    if (overlap) {
      return res.status(400).json({ error: 'คุณมีรายการลาในช่วงเวลาดังกล่าวอยู่แล้ว' });
    }

    // ✅ คำนวณวันลาหักวันหยุด (จันทร์-ศุกร์)
    const calculateWorkDays = (d1, d2) => {
      let count = 0;
      let cur = new Date(d1);
      while (cur <= d2) {
        const dayOfWeek = cur.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) count++; // ไม่ใช่เสาร์ (6) และอาทิตย์ (0)
        cur.setDate(cur.getDate() + 1);
      }
      return count;
    };

    let totalDaysRequested = calculateWorkDays(start, end);

    // ✅ ปรับลดวันลาในกรณีลาครึ่งวัน
    if (startDuration !== 'Full') totalDaysRequested -= 0.5;
    // ป้องกันกรณีลาวันเดียวแล้วเลือกครึ่งวันทั้งเริ่มและจบ (ไม่ให้เหลือ 0 วัน)
    if (endDuration !== 'Full' && totalDaysRequested > 0.5) totalDaysRequested -= 0.5;

    if (totalDaysRequested <= 0) {
      return res.status(400).json({ error: "จำนวนวันที่ลาต้องมากกว่า 0" });
    }

    // 3. ตรวจสอบโควตา (Quota Validation)
    const quota = await prisma.leaveQuota.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: userId,
          leaveTypeId: leaveTypeRecord.id,
          year: currentYear,
        },
      },
    });

    if (!quota) return res.status(400).json({ error: "ไม่พบโควต้าวันลาสำหรับปีนี้" });

    const remaining = Number(quota.totalDays) - Number(quota.usedDays);
    if (remaining < totalDaysRequested) {
      return res.status(400).json({
        error: `วันลาคงเหลือไม่พอ (เหลือ ${remaining} วัน, ขอมา ${totalDaysRequested} วัน)`,
      });
    }

    // 4. บันทึกข้อมูลแบบ Transaction (ใบลา + แจ้งเตือน)
    const result = await prisma.$transaction(async (tx) => {
      const newRequest = await tx.leaveRequest.create({
        data: {
          employeeId: userId,
          leaveTypeId: leaveTypeRecord.id,
          startDate: start,
          endDate: end,
          totalDaysRequested,
          reason,
          status: "Pending",
          startDuration: startDuration || "Full",
          endDuration: endDuration || "Full",
        },
      });

      const hrUsers = await tx.employee.findMany({ where: { role: "HR" } });
      const notifications = hrUsers.map((hr) => ({
        employeeId: hr.id,
        notificationType: "NewRequest",
        message: `มีคำขอลาใหม่จากคุณ ${req.user.firstName} ${req.user.lastName}`,
        relatedRequestId: newRequest.id,
      }));

      if (notifications.length > 0) {
        await tx.notification.createMany({ data: notifications });
      }

      return newRequest;
    });

    // 5. แจ้งเตือนผ่าน Socket.io (ถ้ามี)
    const io = req.app.get("io");
    if (io) {
      io.to('hr_room').emit("notification", {
        type: "NewRequest",
        message: `มีคำขอลาใหม่จากคุณ ${req.user.firstName} ${req.user.lastName}`,
        data: result,
      });
    }

    res.status(201).json({
      message: "ส่งคำขอลาเรียบร้อยแล้ว รอ HR อนุมัติ",
      data: result,
    });

  } catch (error) {
    console.error("Backend Error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการสร้างคำขอลา" });
  }
};

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

// ---------------------------------------------------------
// ส่วนของ HR (และส่วนรวมสำหรับปฏิทิน)
// ---------------------------------------------------------

// 👇 เพิ่มฟังก์ชันนี้สำหรับหน้าปฏิทิน (Team Calendar)
exports.getAllLeaves = async (req, res) => {
  try {
    const leaves = await prisma.leaveRequest.findMany({
      include: {
        employee: { select: { firstName: true, lastName: true } },
        leaveType: { select: { typeName: true } },
      },
      orderBy: { startDate: "desc" },
    });

    // Map ข้อมูลให้ Frontend ใช้ง่าย
    const formattedLeaves = leaves.map((leave) => ({
      id: leave.id,
      name: `${leave.employee.firstName} ${leave.employee.lastName}`,
      type: leave.leaveType.typeName,
      startDate: leave.startDate,
      endDate: leave.endDate,
      status: leave.status,
    }));

    res.json(formattedLeaves);
  } catch (error) {
    res.status(500).json({ error: "ดึงข้อมูลไม่สำเร็จ" });
  }
};

// backend/src/controllers/leaveController.js

exports.updateLeaveStatus = async (req, res) => {
  try {
    // ✅ ปรับให้รับ 'id' แทน 'requestId' ตามที่ Frontend ส่งมา
    const { id, status, rejectReason } = req.body;
    const hrId = req.user.id;

    const request = await prisma.leaveRequest.findUnique({
      where: { id: parseInt(id) },
    });

    if (!request) return res.status(404).json({ error: "ไม่พบคำขอนี้" });
    if (request.status !== "Pending")
      return res.status(400).json({ error: "รายการนี้ถูกดำเนินการไปแล้ว" });

    await prisma.$transaction(async (tx) => {
      // 1. อัปเดตสถานะใบลา
      await tx.leaveRequest.update({
        where: { id: parseInt(id) },
        data: {
          status: status,
          approvedByHrId: hrId,
          approvalDate: new Date(),
        },
      });

      // 2. หักโควตาวันลา (เฉพาะเมื่ออนุมัติ)
      if (status === "Approved") {
        await tx.leaveQuota.update({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: request.employeeId,
              leaveTypeId: request.leaveTypeId,
              year: new Date(request.startDate).getFullYear(),
            },
          },
          data: {
            // totalDaysRequested ใน Schema เป็น Decimal ต้องแปลงเป็นตัวเลข
            usedDays: { increment: request.totalDaysRequested },
          },
        });
      }

      // 3. แจ้งเตือนพนักงาน
      const notiMessage =
        status === "Approved"
          ? "คำขอลาของคุณได้รับการอนุมัติแล้ว"
          : `คำขอลาของคุณถูกปฏิเสธ ${rejectReason ? ": " + rejectReason : ""}`;

      await tx.notification.create({
        data: {
          employeeId: request.employeeId,
          notificationType: status === "Approved" ? "Approval" : "Rejection",
          message: notiMessage,
          relatedRequestId: parseInt(id),
        },
      });
    });

    res.json({ message: `ดำเนินการ ${status} เรียบร้อยแล้ว` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัปเดตสถานะ" });
  }
};

// backend/src/controllers/leaveController.js

exports.getPendingRequests = async (req, res) => {
  try {
    const requests = await prisma.leaveRequest.findMany({
      where: { status: "Pending" },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            // ❌ ห้ามมี department: true เพราะใน Schema ไม่มีฟิลด์นี้
          },
        },
        leaveType: true,
      },
      // ✅ ใช้ requestedAt ตามที่มีใน Schema
      orderBy: { requestedAt: "asc" },
    });
    res.json(requests);
  } catch (error) {
    // ดู Error จริงในหน้าจอ Terminal ของ Backend
    console.error("Backend Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
