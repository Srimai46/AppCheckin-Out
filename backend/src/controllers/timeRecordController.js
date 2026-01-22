const prisma = require("../config/prisma");
const { auditLog } = require("../utils/logger");

// =========================
// Notification Helpers
// =========================

const formatBangkokTimeHHMM = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

/**
 * สร้าง Notification ให้ HR ทุกคน
 */
const notifyHR = async ({
  io,
  actorEmployeeId,
  type,
  message,
  relatedRequestId = null,
}) => {
  // ✅ FIX 1: แก้ Query HR ผ่าน Role Relation Name
  const hrUsers = await prisma.employee.findMany({
    where: { 
        role: { name: "HR" }, 
        isActive: true 
    },
    select: { id: true },
  });

  const hrIds = hrUsers.map((u) => u.id);
  if (hrIds.length === 0) return;

  const rows = hrIds.map((hrId) => ({
    employeeId: hrId,
    notificationType: type,
    message,
    relatedRequestId: relatedRequestId ? safeNum(relatedRequestId) : null,
    relatedEmployeeId: safeNum(actorEmployeeId),
    isRead: false,
  }));

  await prisma.notification.createMany({ data: rows });

  if (io) {
    hrIds.forEach((hrId) => {
      io.to(`user_${hrId}`).emit("notification_refresh");
    });
  }
};

// =========================
// Helper Functions
// =========================

const getThaiStartOfDay = () => {
  const now = new Date();
  const start = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  start.setUTCHours(0, 0, 0, 0);
  return new Date(start.getTime() - 7 * 60 * 60 * 1000);
};

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

const checkIsHolidayOrWeekend = async (date) => {
  const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
  const dateStr = date.toLocaleDateString("en-CA", {
    timeZone: "Asia/Bangkok",
  });
  const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

  const holiday = await prisma.holiday.findUnique({
    where: { date: targetDate },
  });

  return {
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    isHoliday: !!holiday,
    holidayName: holiday?.name || null,
  };
};

// ❌ REMOVED: calculateMidpoint (ใช้ Break Time จาก DB แทนแม่นยำกว่า)

// =========================
// Controllers
// =========================

exports.checkIn = async (req, res) => {
  try {
    const userId = req.user.id;
    const { note, location } = req.body;
    const now = new Date();

    // 1) ตรวจสอบวันหยุด
    const { isWeekend, isHoliday, holidayName } = await checkIsHolidayOrWeekend(now);
    const isSpecialDay = isWeekend || isHoliday;

    // 2) เช็คว่ามี record วันนี้แล้วไหม
    const todayStart = getThaiStartOfDay();
    const existingRecord = await prisma.timeRecord.findFirst({
      where: {
        employeeId: userId,
        workDate: { gte: todayStart },
      },
    });

    if (existingRecord) {
      return res.status(400).json({ error: "You have already checked in for today." });
    }

    // --- เช็คใบลา ---
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);

    const approvedLeave = await prisma.leaveRequest.findFirst({
      where: {
        employeeId: userId,
        status: "Approved",
        startDate: { lte: todayEnd },
        endDate: { gte: todayStart },
      },
    });

    let isHalfMorningLeave = false;
    if (approvedLeave) {
      if (
        approvedLeave.startDuration === "HalfMorning" ||
        approvedLeave.endDuration === "HalfMorning"
      ) {
        isHalfMorningLeave = true;
      }
    }

    // ✅ FIX 2: ดึง Config ผ่าน Relation เพื่อเอา Break Time
    const employee = await prisma.employee.findUnique({
        where: { id: userId },
        include: { role: { include: { workConfig: true } } }
    });
    
    const config = employee?.role?.workConfig;

    // Default Values
    const startHour = config?.startHour ?? 9;
    const startMin = config?.startMin ?? 0;
    
    // ✅ NEW: Break Time Values (สำหรับคำนวณครึ่งวัน)
    // ถ้าลาเช้า -> ต้องมาเข้างานตอน "หมดเวลาพัก" (Break End)
    const breakEndHour = config?.breakEndHour ?? 13;
    const breakEndMin = config?.breakEndMin ?? 0;

    const standardStartTime = new Date(todayStart);
    standardStartTime.setHours(todayStart.getHours() + startHour);
    standardStartTime.setMinutes(startMin);

    let expectedCheckInTime = standardStartTime;

    // ✅ FIX 3: ถ้าลาเช้า ให้เริ่มงานตอนหมดเวลาพัก
    if (isHalfMorningLeave) {
        expectedCheckInTime = new Date(todayStart);
        expectedCheckInTime.setHours(todayStart.getHours() + breakEndHour);
        expectedCheckInTime.setMinutes(breakEndMin);
    }

    // 4) สถานะ check-in (Late Threshold สามารถเพิ่มตรงนี้ได้ถ้าต้องการ)
    const lateThresholdMin = config?.lateThresholdMin || 15;
    const lateLimitTime = new Date(expectedCheckInTime.getTime() + lateThresholdMin * 60000);

    let isLate = false;
    let checkInStatusEnum = "ON_TIME";

    if (!isSpecialDay && now > lateLimitTime) {
      isLate = true;
      checkInStatusEnum = "LATE";
    }

    // 5) statusText
    let statusText = "On Time";
    if (isSpecialDay) {
      statusText = isHoliday ? `Holiday (${holidayName})` : "Weekend Work";
    } else if (isLate) {
      statusText = "Late";
    } else if (isHalfMorningLeave) {
      statusText = "Half Day (Afternoon Shift)";
    }

    // 6) บันทึก
    const record = await prisma.$transaction(async (tx) => {
      const created = await tx.timeRecord.create({
        data: {
          employeeId: userId,
          workDate: now,
          checkInTime: now,
          isLate,
          checkInStatus: checkInStatusEnum,
          note: isSpecialDay || isHalfMorningLeave ? `[${statusText}] ${note || ""}` : note || null,
          checkInLat: location?.lat ? parseFloat(location.lat) : null,
          checkInLng: location?.lng ? parseFloat(location.lng) : null,
        },
      });

      await auditLog(tx, {
        action: "CREATE",
        modelName: "TimeRecord",
        recordId: created.id,
        userId,
        details: `Employee checked in: ${statusText} (Status: ${checkInStatusEnum})`,
        newValue: created,
        req,
      });

      return created;
    });

    // audit realtime
    const io = req.app.get("io");
    if (io) {
      io.emit("new-audit-log", {
        id: Date.now(),
        action: "CREATE",
        modelName: "TimeRecord",
        recordId: record.id,
        performedBy: { firstName: req.user.firstName, lastName: req.user.lastName },
        details: `Employee checked in: ${statusText}`,
        createdAt: now,
      });
    }

    // =========================
    // Notifications to HR
    // =========================
    try {
      const io2 = req.app.get("io");
      const fullName = `${req.user.firstName} ${req.user.lastName}`;
      const timeStr = formatBangkokTimeHHMM(now);

      await notifyHR({
        io: io2,
        actorEmployeeId: userId,
        type: "CheckIn",
        message: `✅ ${fullName} checked in at ${timeStr}`,
      });

      if (isLate) {
        await notifyHR({
          io: io2,
          actorEmployeeId: userId,
          type: "LateWarning",
          message: `⏰ Late: ${fullName} checked in at ${timeStr}`,
        });
      }
    } catch (e) {
      console.error("Notify HR (checkIn) error:", e);
    }

    return res.status(201).json({
      message: "Check-in successful",
      result: {
        date: formatShortDate(now),
        time: formatThaiTime(now),
        status: statusText,
        isLate,
        location,
      },
      data: record,
    });
  } catch (error) {
    console.error("Check-in Error:", error);
    return res.status(500).json({ message: "Error occurred during check-in." });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const userId = req.user.id;
    const { location, note } = req.body; // รับ Note ตอนออกด้วยถ้ามี
    const now = new Date();

    const todayStart = getThaiStartOfDay();

    // ตรวจสอบวันหยุด
    const { isWeekend, isHoliday } = await checkIsHolidayOrWeekend(now);
    const isSpecialDay = isWeekend || isHoliday;

    const record = await prisma.timeRecord.findFirst({
      where: { employeeId: userId, workDate: { gte: todayStart } },
      orderBy: { id: "desc" },
    });

    if (!record) {
      return res.status(400).json({ error: "Check-in record not found." });
    }

    // --- เช็คใบลา ---
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);

    const approvedLeave = await prisma.leaveRequest.findFirst({
      where: {
        employeeId: userId,
        status: "Approved",
        startDate: { lte: todayEnd },
        endDate: { gte: todayStart },
      },
    });

    let isHalfAfternoonLeave = false;
    if (approvedLeave) {
      if (
        approvedLeave.startDuration === "HalfAfternoon" ||
        approvedLeave.endDuration === "HalfAfternoon"
      ) {
        isHalfAfternoonLeave = true;
      }
    }

    // ✅ FIX 4: ดึง Config เพื่อเอา Break Time
    const employee = await prisma.employee.findUnique({
        where: { id: userId },
        include: { role: { include: { workConfig: true } } }
    });
    
    const config = employee?.role?.workConfig;

    const endHour = config?.endHour ?? 18;
    const endMin = config?.endMin ?? 0;
    
    // ✅ NEW: Break Time (สำหรับลาบ่าย)
    // ถ้าลาบ่าย -> เลิกงานได้ตั้งแต่ "เริ่มพัก" (Break Start)
    const breakStartHour = config?.breakStartHour ?? 12;
    const breakStartMin = config?.breakStartMin ?? 0;

    const standardEndTime = new Date(todayStart);
    standardEndTime.setHours(todayStart.getHours() + endHour);
    standardEndTime.setMinutes(endMin);

    let expectedCheckOutTime = standardEndTime;

    // ✅ FIX 5: ถ้าลาบ่าย เลิกงานได้ตอนเริ่มพัก
    if (isHalfAfternoonLeave) {
        expectedCheckOutTime = new Date(todayStart);
        expectedCheckOutTime.setHours(todayStart.getHours() + breakStartHour);
        expectedCheckOutTime.setMinutes(breakStartMin);
    }

    // สถานะ check-out
    let isEarlyLeave = false;
    let checkOutStatusEnum = "NORMAL";

    // เช็คว่าออกก่อนเวลาไหม
    if (!isSpecialDay && now < expectedCheckOutTime) {
      isEarlyLeave = true;
      checkOutStatusEnum = "EARLY";
    }

    // ถ้าลาบ่าย และออกก่อนเวลาปกติ (แต่หลังเวลา breakStart) ถือว่า Normal สำหรับการลา
    // แต่ถ้าออกก่อน BreakStart อีก ก็ถือว่า Early
    if (!isSpecialDay && isHalfAfternoonLeave) {
        // Code เดิมของคุณกำหนดว่าถ้าลาบ่ายแล้วออกก่อนให้เป็น EARLY
        // แต่จริงๆ ถ้าเขาลาบ่าย เขามีสิทธิ์ออกตอนเที่ยง ถ้าออกก่อนเที่ยงถึงจะเป็น Early
        checkOutStatusEnum = isEarlyLeave ? "EARLY" : "LEAVE";
    }

    const expectedTimeStr = formatThaiTime(expectedCheckOutTime);
    const statusText = isHalfAfternoonLeave
      ? isEarlyLeave
        ? `Half Day (Early < ${expectedTimeStr})`
        : "Half Day (Afternoon Leave)"
      : isEarlyLeave
      ? "Early Leave"
      : "On Time";

    const updated = await prisma.$transaction(async (tx) => {
      const out = await tx.timeRecord.update({
        where: { id: record.id },
        data: {
          checkOutTime: now,
          checkOutStatus: checkOutStatusEnum,
          checkOutLat: location?.lat ? parseFloat(location.lat) : null,
          checkOutLng: location?.lng ? parseFloat(location.lng) : null,
          note: record.note
            ? note 
                ? `${record.note} | ${note} (Out)` // Append new note
                : record.note
            : note || null,
        },
      });

      await auditLog(tx, {
        action: "UPDATE",
        modelName: "TimeRecord",
        recordId: out.id,
        userId,
        details: `Employee checked out: ${statusText} (Status: ${checkOutStatusEnum})`,
        oldValue: { checkOutTime: record.checkOutTime },
        newValue: { checkOutTime: out.checkOutTime },
        req,
      });

      return out;
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("new-audit-log", {
        id: Date.now(),
        action: "UPDATE",
        modelName: "TimeRecord",
        recordId: updated.id,
        performedBy: { firstName: req.user.firstName, lastName: req.user.lastName },
        details: `Employee checked out: ${statusText}`,
        createdAt: now,
      });
    }

    // =========================
    // Notifications to HR
    // =========================
    try {
      const io2 = req.app.get("io");
      const fullName = `${req.user.firstName} ${req.user.lastName}`;
      const timeStr = formatBangkokTimeHHMM(now);

      await notifyHR({
        io: io2,
        actorEmployeeId: userId,
        type: "CheckOut",
        message: `🏁 ${fullName} checked out at ${timeStr}`,
      });

      if (isEarlyLeave) {
        await notifyHR({
          io: io2,
          actorEmployeeId: userId,
          type: "EarlyLeaveWarning",
          message: `⚠️ Early leave: ${fullName} checked out at ${timeStr}`,
        });
      }
    } catch (e) {
      console.error("Notify HR (checkOut) error:", e);
    }

    return res.json({
      message: "Clock-out successful",
      result: {
        checkOutTime: formatThaiTime(now),
        isEarlyLeave,
        status: statusText,
        location,
      },
      data: updated,
    });
  } catch (error) {
    console.error("Check-out Error:", error);
    return res.status(500).json({ error: "Error occurred during check-out." });
  }
};

exports.getMyHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    // const userRole = req.user.role; // ไม่ใช้แล้ว เพราะเราจะดึงผ่าน Relation ชัวร์กว่า
    const { year, month } = req.query;

    // ✅ FIX 1: ดึง Config ผ่าน Relation (Employee -> Role -> WorkConfig)
    const employeeData = await prisma.employee.findUnique({
        where: { id: userId },
        include: {
            role: {
                include: { workConfig: true }
            }
        }
    });

    const config = employeeData?.role?.workConfig;

    let dateCondition = {};
    if (year) {
      const targetYear = parseInt(year);
      let startDate, endDate;

      if (month && month !== "All") {
        const m = parseInt(month) - 1;
        startDate = new Date(Date.UTC(targetYear, m, 1));
        endDate = new Date(Date.UTC(targetYear, m + 1, 0, 23, 59, 59));
      } else {
        startDate = new Date(Date.UTC(targetYear, 0, 1));
        endDate = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59));
      }

      dateCondition = { workDate: { gte: startDate, lte: endDate } };
    }

    const history = await prisma.timeRecord.findMany({
      where: { employeeId: userId, ...dateCondition },
      orderBy: { workDate: "desc" },
    });

    const formattedHistory = history.map((item) => {
      let workingHours = "-";
      if (item.checkInTime && item.checkOutTime) {
        const diffInMs = new Date(item.checkOutTime) - new Date(item.checkInTime);
        const hours = Math.floor(diffInMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
        workingHours = `${hours} Hours ${minutes} Min`;
      }

      let inStatusDisplay = "On Time";
      if (item.checkInStatus) {
        if (item.checkInStatus === "LATE") inStatusDisplay = "Late";
        else if (item.checkInStatus === "LEAVE") inStatusDisplay = "Leave (Half Day)";
        else if (item.checkInStatus === "ABSENT") inStatusDisplay = "Absent";
      } else {
        inStatusDisplay = item.isLate ? "Late" : "On Time";
      }

      let outStatusDisplay = "-";
      if (item.checkOutTime) {
        if (item.checkOutStatus) {
          if (item.checkOutStatus === "EARLY") outStatusDisplay = "Early Leave";
          else if (item.checkOutStatus === "LEAVE") outStatusDisplay = "Leave (Half Day)";
          else outStatusDisplay = "Normal";
        } else {
          outStatusDisplay = "Normal";
        }
      } else {
        const recordDate = new Date(item.workDate).toISOString().split("T")[0];
        const todayDate = new Date().toISOString().split("T")[0];
        outStatusDisplay = recordDate === todayDate ? "Still Working" : "Missing Check-out";
      }

      return {
        ...item,
        dateDisplay: item.workDate.toISOString().split("T")[0],
        checkInTimeDisplay: item.checkInTime
          ? new Date(item.checkInTime).toLocaleTimeString("th-TH")
          : "-",
        checkOutTimeDisplay: item.checkOutTime
          ? new Date(item.checkOutTime).toLocaleTimeString("th-TH")
          : "Not checked out yet",
        statusDisplay: inStatusDisplay,
        outStatusDisplay,
        workingHours,
        // ✅ FIX 2: ส่ง Break Time กลับไปให้ Frontend ด้วย
        standardConfig: config
          ? {
              start: `${String(config.startHour).padStart(2, "0")}:${String(config.startMin).padStart(2, "0")}`,
              end: `${String(config.endHour).padStart(2, "0")}:${String(config.endMin).padStart(2, "0")}`,
              breakStart: `${String(config.breakStartHour || 12).padStart(2, "0")}:${String(config.breakStartMin || 0).padStart(2, "0")}`,
              breakEnd: `${String(config.breakEndHour || 13).padStart(2, "0")}:${String(config.breakEndMin || 0).padStart(2, "0")}`
            }
          : null,
        note: item.note || "-",
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedHistory.length,
      data: formattedHistory,
    });
  } catch (error) {
    console.error("GetHistory Error:", error);
    return res.status(500).json({ success: false, error: "Server Error" });
  }
};

exports.getAllAttendance = async (req, res) => {
  try {
    const { start, end } = req.query;
    let whereCondition = {};

    if (start && end) {
      whereCondition.workDate = {
        gte: new Date(start),
        lte: new Date(new Date(end).setHours(23, 59, 59, 999)),
      };
    }

    // ✅ FIX 3: แก้การ Select Role และ Department (Schema ใหม่)
    const records = await prisma.timeRecord.findMany({
        where: whereCondition,
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              profileImageUrl: true,
              // ดึงเฉพาะชื่อ Role และ Department
              role: { select: { name: true } }, 
              department: { select: { name: true } } 
            },
          },
        },
        orderBy: { workDate: "desc" },
    });

    const formattedRecords = records.map((item) => {
      let inStatusDisplay = "On Time";
      if (item.checkInStatus) {
        if (item.checkInStatus === "LATE") inStatusDisplay = "Late";
        else if (item.checkInStatus === "LEAVE") inStatusDisplay = "Leave (Half Day)";
        else if (item.checkInStatus === "ABSENT") inStatusDisplay = "Absent";
      } else {
        inStatusDisplay = item.isLate ? "Late" : "On Time";
      }

      let outStatusDisplay = "-";
      if (item.checkOutTime) {
        if (item.checkOutStatus) {
          if (item.checkOutStatus === "EARLY") outStatusDisplay = "Early Leave";
          else if (item.checkOutStatus === "LEAVE") outStatusDisplay = "Leave (Half Day)";
          else outStatusDisplay = "On Time";
        } else outStatusDisplay = "On Time";
      } else {
        const recordDate = new Date(item.workDate).toISOString().split("T")[0];
        const todayDate = new Date().toISOString().split("T")[0];
        outStatusDisplay = recordDate === todayDate ? "Still Working" : "Missing Check-out";
      }

      let workingHours = "-";
      if (item.checkInTime && item.checkOutTime) {
        const diffMs = new Date(item.checkOutTime) - new Date(item.checkInTime);
        const hrs = Math.floor(diffMs / 3600000);
        const mins = Math.floor((diffMs % 3600000) / 60000);
        workingHours = `${hrs}h ${mins}m`;
      }

      return {
        ...item,
        employeeName: `${item.employee.firstName} ${item.employee.lastName}`,
        // ✅ FIX 4: Map ชื่อ Role/Dept จาก Object ให้เป็น String
        role: item.employee.role?.name || "-", 
        department: item.employee.department?.name || "-",
        dateDisplay: formatShortDate(item.workDate),
        checkInDisplay: formatThaiTime(item.checkInTime),
        checkOutDisplay: item.checkOutTime ? formatThaiTime(item.checkOutTime) : "-",
        inStatus: inStatusDisplay,
        outStatus: outStatusDisplay,
        duration: workingHours,
        note: item.note || "-",
      };
    });

    return res.json(formattedRecords);
  } catch (error) {
    console.error("GetAllAttendance Error:", error);
    return res.status(500).json({ error: "Data retrieval failed." });
  }
};

exports.getUserHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const employeeId = Number(id);

    if (isNaN(employeeId)) return res.status(400).json({ error: "Invalid Employee ID" });

    // ✅ FIX 1: ดึง Employee พร้อม Role และ Config ในคำสั่งเดียว (ลด DB Query)
    const [history, employeeData] = await Promise.all([
      prisma.timeRecord.findMany({
        where: { employeeId },
        orderBy: { workDate: "desc" },
      }),
      prisma.employee.findUnique({
        where: { id: employeeId },
        include: {
            role: {
                include: { workConfig: true } // ดึง Config ผ่าน Role
            }
        }
      }),
    ]);

    if (!employeeData) return res.status(404).json({ error: "Employee not found" });

    // ✅ FIX 2: ดึง Config จาก Relation
    const config = employeeData.role?.workConfig;

    const formattedHistory = history.map((item) => {
      let workingHours = "-";
      if (item.checkInTime && item.checkOutTime) {
        const diffMs = new Date(item.checkOutTime) - new Date(item.checkInTime);
        const hrs = Math.floor(diffMs / 3600000);
        const mins = Math.floor((diffMs % 3600000) / 60000);
        workingHours = `${hrs}h ${mins}m`;
      }

      let inStatusDisplay = "On Time";
      if (item.checkInStatus) {
        if (item.checkInStatus === "LATE") inStatusDisplay = "Late";
        else if (item.checkInStatus === "LEAVE") inStatusDisplay = "Leave (Half Day)";
        else if (item.checkInStatus === "ABSENT") inStatusDisplay = "Absent";
      } else inStatusDisplay = item.isLate ? "Late" : "On Time";

      let outStatusDisplay = "-";
      if (item.checkOutTime) {
        if (item.checkOutStatus) {
          if (item.checkOutStatus === "EARLY") outStatusDisplay = "Early Leave";
          else if (item.checkOutStatus === "LEAVE") outStatusDisplay = "Leave (Half Day)";
          else outStatusDisplay = "Normal";
        } else outStatusDisplay = "Normal";
      } else {
        const recordDate = new Date(item.workDate).toISOString().split("T")[0];
        const todayDate = new Date().toISOString().split("T")[0];
        outStatusDisplay = recordDate === todayDate ? "Still Working" : "Missing Check-out";
      }

      return {
        ...item,
        dateDisplay: formatShortDate(item.workDate),
        checkInDisplay: formatThaiTime(item.checkInTime),
        checkOutDisplay: item.checkOutTime ? formatThaiTime(item.checkOutTime) : "-",
        inStatus: inStatusDisplay,
        outStatus: outStatusDisplay,
        duration: workingHours,
        note: item.note || "-",
        // ✅ FIX 3: เพิ่ม Break Time เข้าไปใน Response
        standardConfig: config
          ? {
              start: `${String(config.startHour).padStart(2, "0")}:${String(config.startMin).padStart(2, "0")}`,
              end: `${String(config.endHour).padStart(2, "0")}:${String(config.endMin).padStart(2, "0")}`,
              breakStart: `${String(config.breakStartHour || 12).padStart(2, "0")}:${String(config.breakStartMin || 0).padStart(2, "0")}`,
              breakEnd: `${String(config.breakEndHour || 13).padStart(2, "0")}:${String(config.breakEndMin || 0).padStart(2, "0")}`
            }
          : null,
      };
    });

    return res.json(formattedHistory);
  } catch (error) {
    console.error("GetUserHistory Error:", error);
    return res.status(500).json({ error: "Data retrieval failed." });
  }
};

exports.getTeamTodayAttendance = async (req, res) => {
  try {
    const todayStart = getThaiStartOfDay();

    const [employees, todayRecords] = await Promise.all([
      prisma.employee.findMany({
        where: { isActive: true },
        // ✅ FIX 4: Select เฉพาะชื่อ Role (ไม่เอาทั้ง Object)
        select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            role: { select: { name: true } }, 
            isActive: true 
        },
        orderBy: { id: "asc" },
      }),
      prisma.timeRecord.findMany({
        where: { workDate: { gte: todayStart } },
        orderBy: { id: "desc" },
      }),
    ]);

    const recordMap = new Map();
    for (const r of todayRecords) {
      if (!recordMap.has(r.employeeId)) recordMap.set(r.employeeId, r);
    }

    const result = employees.map((emp) => {
      const r = recordMap.get(emp.id);

      let inStatus = "Waiting";
      if (r?.checkInTime) {
        if (r.checkInStatus) {
          if (r.checkInStatus === "LATE") inStatus = "Late";
          else if (r.checkInStatus === "LEAVE") inStatus = "Leave";
          else inStatus = "On Time";
        } else inStatus = r.isLate ? "Late" : "On Time";
      }

      let outStatus = "-";
      if (r?.checkOutTime) {
        if (r.checkOutStatus) {
          if (r.checkOutStatus === "EARLY") outStatus = "Early Leave";
          else if (r.checkOutStatus === "LEAVE") outStatus = "Leave (PM)";
          else outStatus = "Normal";
        } else outStatus = "Normal";
      }

      let duration = "-";
      if (r?.checkInTime) {
        const endTime = r.checkOutTime ? new Date(r.checkOutTime) : new Date();
        const diffMs = endTime - new Date(r.checkInTime);
        const hrs = Math.floor(diffMs / 3600000);
        const mins = Math.floor((diffMs % 3600000) / 60000);
        duration = `${hrs}h ${mins}m`;
      }

      return {
        employeeId: emp.id,
        fullName: `${emp.firstName} ${emp.lastName}`,
        // ✅ FIX 5: แปลง Role Object เป็น String
        role: emp.role?.name || "-",
        isActive: emp.isActive,
        checkInTimeDisplay: r?.checkInTime ? formatThaiTime(r.checkInTime) : null,
        checkOutTimeDisplay: r?.checkOutTime ? formatThaiTime(r.checkOutTime) : null,
        inStatus,
        outStatus,
        duration,
        state: !r?.checkInTime ? "ABSENT" : !r?.checkOutTime ? "WORKING" : "COMPLETED",
        note: r?.note || null,
      };
    });

    return res.status(200).json({ success: true, count: result.length, data: result });
  } catch (error) {
    console.error("getTeamTodayAttendance Error:", error);
    return res.status(500).json({ success: false, error: "Team data retrieval failed today." });
  }
};

// =========================
// HR manual check-in/out
// (คง logic เดิมของคุณ + ADD noti)
// =========================

exports.hrCheckInEmployee = async (req, res) => {
  try {
    const employeeId = Number(req.params.employeeId);
    const hrId = req.user.id;
    const { note } = req.body;
    const now = new Date();

    const { isWeekend, isHoliday, holidayName } = await checkIsHolidayOrWeekend(now);
    const isSpecialDay = isWeekend || isHoliday;

    const todayStart = getThaiStartOfDay();
    if (!employeeId) return res.status(400).json({ error: "Invalid Employee ID" });

    // ✅ FIX 1: ดึง Employee พร้อม Role และ WorkConfig เลย (Query เดียวจบ)
    const [employee, existingRecord] = await Promise.all([
      prisma.employee.findUnique({
        where: { id: employeeId },
        include: { 
            role: { 
                include: { workConfig: true } // ดึง Config มาด้วยเลย
            } 
        },
      }),
      prisma.timeRecord.findFirst({
        where: { employeeId, workDate: { gte: todayStart } },
        orderBy: { id: "desc" },
      }),
    ]);

    if (!employee) return res.status(404).json({ error: "Employee not found." });

    if (existingRecord?.checkInTime) {
      return res.status(400).json({ error: "This employee has already clocked in for today." });
    }

    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);

    const approvedLeave = await prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        status: "Approved",
        startDate: { lte: todayEnd },
        endDate: { gte: todayStart },
      },
    });

    let isHalfMorningLeave = false;
    if (approvedLeave) {
      if (
        approvedLeave.startDuration === "HalfMorning" ||
        approvedLeave.endDuration === "HalfMorning"
      ) {
        isHalfMorningLeave = true;
      }
    }

    // ✅ FIX 2: ดึง Config จาก Relation
    const config = employee.role?.workConfig;

    // Default Values
    const startHour = config?.startHour ?? 9;
    const startMin = config?.startMin ?? 0;
    
    // ✅ NEW: Break Time for Half Day logic
    const breakEndHour = config?.breakEndHour ?? 13;
    const breakEndMin = config?.breakEndMin ?? 0;

    const standardStartTime = new Date(todayStart);
    standardStartTime.setHours(todayStart.getHours() + startHour);
    standardStartTime.setMinutes(startMin);

    let expectedCheckInTime = standardStartTime;

    // ✅ FIX 3: ถ้าลาเช้า ให้เริ่มงานตอน "หมดเวลาพัก" (13:00)
    if (isHalfMorningLeave) {
        expectedCheckInTime = new Date(todayStart);
        expectedCheckInTime.setHours(todayStart.getHours() + breakEndHour);
        expectedCheckInTime.setMinutes(breakEndMin);
    }

    let isLate = false;
    let checkInStatusEnum = "ON_TIME";
    if (!isSpecialDay && now > expectedCheckInTime) {
      isLate = true;
      checkInStatusEnum = "LATE";
    }

    let statusText = "On Time";
    if (isSpecialDay) statusText = isHoliday ? `Holiday (${holidayName})` : "Weekend Work";
    else if (isLate) statusText = "Late";
    else if (isHalfMorningLeave) statusText = "Half Day (Afternoon Shift)"; // เพิ่ม Status ให้ชัดเจน

    const saved = await prisma.$transaction(async (tx) => {
      const logDetails = note ? `[${statusText}] ${note}` : `HR Clock-in: ${statusText}`;

      const record = await tx.timeRecord.create({
        data: {
          employeeId,
          workDate: now,
          checkInTime: now,
          isLate,
          checkInStatus: checkInStatusEnum,
          note: logDetails,
        },
      });

      await auditLog(tx, {
        action: "CREATE",
        modelName: "TimeRecord",
        recordId: record.id,
        userId: hrId,
        details: `HR manually clocked in for ${employee.firstName} ${employee.lastName} (${statusText})`,
        newValue: record,
        req,
      });

      return record;
    });

    // audit realtime
    const io = req.app.get("io");
    if (io) {
      io.emit("new-audit-log", {
        id: Date.now(),
        action: "CREATE",
        modelName: "TimeRecord",
        recordId: saved.id,
        performedBy: { firstName: req.user.firstName, lastName: req.user.lastName },
        details: `HR Manual Check-in for: ${employee.firstName} ${employee.lastName} (${statusText})`,
        createdAt: now,
      });
    }

    // notify HR group
    try {
      const io2 = req.app.get("io");
      const fullName = `${employee.firstName} ${employee.lastName}`;
      const timeStr = formatBangkokTimeHHMM(now);

      await notifyHR({
        io: io2,
        actorEmployeeId: employeeId,
        type: "CheckIn",
        message: `✅ ${fullName} checked in at ${timeStr} (by HR)`,
      });

      if (isLate) {
        await notifyHR({
          io: io2,
          actorEmployeeId: employeeId,
          type: "LateWarning",
          message: `⏰ Late: ${fullName} checked in at ${timeStr} (by HR)`,
        });
      }
    } catch (e) {
      console.error("Notify HR (hrCheckInEmployee) error:", e);
    }

    return res.status(200).json({
      message: "HR Clock-in successful",
      result: {
        employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        date: formatShortDate(now),
        time: formatThaiTime(now),
        isLate,
        status: statusText,
      },
      data: saved,
    });
  } catch (error) {
    console.error("hrCheckInEmployee Error:", error);
    return res.status(500).json({ error: "HR Clock-in failed." });
  }
};

exports.hrCheckOutEmployee = async (req, res) => {
  try {
    const employeeId = Number(req.params.employeeId);
    const hrId = req.user.id;
    const { note } = req.body;

    if (!employeeId) return res.status(400).json({ error: "Invalid Employee ID" });

    const now = new Date();
    const todayStart = getThaiStartOfDay();

    // ✅ FIX 4: ดึง Employee พร้อม Role และ WorkConfig
    const [employee, record] = await Promise.all([
      prisma.employee.findUnique({
        where: { id: employeeId },
        include: { 
            role: { 
                include: { workConfig: true } 
            } 
        },
      }),
      prisma.timeRecord.findFirst({
        where: { employeeId, workDate: { gte: todayStart } },
        orderBy: { id: "desc" },
      }),
    ]);

    if (!employee) return res.status(404).json({ error: "Employee not found." });
    if (!record?.checkInTime) return res.status(400).json({ error: "Check-in record not found." });
    if (record.checkOutTime) return res.status(400).json({ error: "Already checked out." });

    // ✅ FIX 5: เช็ค Leave เพื่อดูว่าลาบ่ายไหม (Missing in original code)
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);
    
    const approvedLeave = await prisma.leaveRequest.findFirst({
        where: {
          employeeId,
          status: "Approved",
          startDate: { lte: todayEnd },
          endDate: { gte: todayStart },
        },
    });

    let isHalfAfternoonLeave = false;
    if (approvedLeave) {
        if (approvedLeave.startDuration === "HalfAfternoon" || approvedLeave.endDuration === "HalfAfternoon") {
            isHalfAfternoonLeave = true;
        }
    }

    // ✅ FIX 6: ดึง Config จาก Relation
    const config = employee.role?.workConfig;

    const endHour = config?.endHour ?? 18;
    const endMin = config?.endMin ?? 0;
    
    // ✅ NEW: Break Time Logic
    const breakStartHour = config?.breakStartHour ?? 12;
    const breakStartMin = config?.breakStartMin ?? 0;

    const standardEndTime = new Date(todayStart);
    standardEndTime.setHours(todayStart.getHours() + endHour);
    standardEndTime.setMinutes(endMin);

    let expectedCheckOutTime = standardEndTime;

    // ✅ FIX 7: ถ้าลาบ่าย เลิกงานได้ตอน "เริ่มพัก" (12:00)
    if (isHalfAfternoonLeave) {
        expectedCheckOutTime = new Date(todayStart);
        expectedCheckOutTime.setHours(todayStart.getHours() + breakStartHour);
        expectedCheckOutTime.setMinutes(breakStartMin);
    }

    let isEarlyLeave = false;
    let checkOutStatusEnum = "NORMAL";
    if (now < expectedCheckOutTime) {
      isEarlyLeave = true;
      checkOutStatusEnum = "EARLY";
    }

    // กรณีลาบ่าย ถ้าออกก่อนเวลาพัก (12:00) ถึงจะเป็น Early
    if (isHalfAfternoonLeave) {
        checkOutStatusEnum = isEarlyLeave ? "EARLY" : "LEAVE";
    }

    const statusText = isHalfAfternoonLeave 
        ? isEarlyLeave ? "Half Day (Early)" : "Half Day (PM Leave)"
        : isEarlyLeave ? "Early Leave" : "Normal";

    const updated = await prisma.$transaction(async (tx) => {
      const out = await tx.timeRecord.update({
        where: { id: record.id },
        data: {
          checkOutTime: now,
          checkOutStatus: checkOutStatusEnum,
          note: record.note
            ? `${record.note} (Out by HR: ${statusText}${note ? ` | ${note}` : ""})`
            : `Clocked out by HR: ${statusText}${note ? ` | ${note}` : ""}`,
        },
      });

      await auditLog(tx, {
        action: "UPDATE",
        modelName: "TimeRecord",
        recordId: out.id,
        userId: hrId,
        details: `HR manually clocked out for ${employee.firstName} ${employee.lastName}. Status: ${statusText}`,
        oldValue: { checkOutTime: record.checkOutTime, note: record.note },
        newValue: { checkOutTime: out.checkOutTime, note: out.note },
        req,
      });

      return out;
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("new-audit-log", {
        id: Date.now(),
        action: "UPDATE",
        modelName: "TimeRecord",
        recordId: updated.id,
        performedBy: { firstName: req.user.firstName, lastName: req.user.lastName },
        details: `HR Manual Check-out for: ${employee.firstName} ${employee.lastName} (${statusText})`,
        createdAt: now,
      });
    }

    try {
      const io2 = req.app.get("io");
      const fullName = `${employee.firstName} ${employee.lastName}`;
      const timeStr = formatBangkokTimeHHMM(now);

      await notifyHR({
        io: io2,
        actorEmployeeId: employeeId,
        type: "CheckOut",
        message: `🏁 ${fullName} checked out at ${timeStr} (by HR)`,
      });

      if (isEarlyLeave) {
        await notifyHR({
          io: io2,
          actorEmployeeId: employeeId,
          type: "EarlyLeaveWarning",
          message: `⚠️ Early leave: ${fullName} checked out at ${timeStr} (by HR)`,
        });
      }
    } catch (e) {
      console.error("Notify HR (hrCheckOutEmployee) error:", e);
    }

    return res.status(200).json({
      message: "HR Clock-out successful",
      result: {
        employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        checkOutTime: formatThaiTime(now),
        isEarlyLeave,
        status: statusText,
      },
      data: updated,
    });
  } catch (error) {
    console.error("hrCheckOutEmployee Error:", error);
    return res.status(500).json({ error: "HR Clock-out failed." });
  }
};

exports.updateWorkConfig = async (req, res) => {
  try {
    // 1. รับค่า Break Time เข้ามาด้วย
    const { 
        roleId, // รับเป็น ID แทน String
        startHour, startMin, endHour, endMin,
        breakStartHour, breakStartMin, breakEndHour, breakEndMin 
    } = req.body;
    
    const hrId = req.user.id;

    // 2. Validation Checks
    const validateTime = (h, m, name) => {
        if (h < 0 || h > 23) throw new Error(`${name}: Hour must be 0-23`);
        if (m < 0 || m > 59) throw new Error(`${name}: Minute must be 0-59`);
    };

    try {
        validateTime(startHour, startMin, "Start Time");
        validateTime(endHour, endMin, "End Time");
        // Validate Break Time (ถ้าส่งมา)
        if (breakStartHour !== undefined) validateTime(breakStartHour, breakStartMin, "Break Start");
        if (breakEndHour !== undefined) validateTime(breakEndHour, breakEndMin, "Break End");
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }

    // 3. หา Role Name เพื่อเอามาลง Log (สวยๆ)
    const targetRole = await prisma.role.findUnique({
        where: { id: parseInt(roleId) }
    });

    if (!targetRole) return res.status(404).json({ error: "Role not found" });

    const formatTime = (h, m) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const workTimeStr = `${formatTime(startHour, startMin)} - ${formatTime(endHour, endMin)}`;
    const breakTimeStr = (breakStartHour !== undefined) 
        ? ` (Break: ${formatTime(breakStartHour, breakStartMin)} - ${formatTime(breakEndHour, breakEndMin)})`
        : "";

    const detailsText = `HR Updated Work Config for Role: ${targetRole.name} -> Work: ${workTimeStr}${breakTimeStr}`;

    // 4. Update Database
    const updatedConfig = await prisma.$transaction(async (tx) => {
      // ใช้ roleId เป็น Unique Key แทน role string
      const config = await tx.workConfiguration.upsert({
        where: { roleId: parseInt(roleId) },
        update: { 
            startHour, startMin, endHour, endMin,
            breakStartHour, breakStartMin, breakEndHour, breakEndMin
        },
        create: { 
            roleId: parseInt(roleId), // Connect via ID
            startHour, startMin, endHour, endMin,
            breakStartHour: breakStartHour || 12, 
            breakStartMin: breakStartMin || 0,
            breakEndHour: breakEndHour || 13, 
            breakEndMin: breakEndMin || 0
        },
      });

      await auditLog(tx, {
        action: "UPDATE",
        modelName: "WorkConfiguration",
        recordId: config.id,
        userId: hrId,
        details: detailsText,
        newValue: config,
        req,
      });

      return config;
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("new-audit-log", {
        id: Date.now(),
        action: "UPDATE",
        modelName: "WorkConfig",
        recordId: updatedConfig.id,
        performedBy: { firstName: req.user.firstName, lastName: req.user.lastName },
        details: detailsText,
        createdAt: new Date(),
      });
    }

    return res.json({
      success: true,
      message: `Updated configuration for ${targetRole.name}`,
      data: updatedConfig,
    });
  } catch (error) {
    console.error("Update Config Error:", error);
    return res.status(500).json({ error: "Failed to update configuration" });
  }
};

exports.getWorkConfigs = async (req, res) => {
  try {
    const configs = await prisma.workConfiguration.findMany({
      // ✅ Include Role เพื่อเอาชื่อ Role มาแสดง
      include: {
        role: {
            select: { id: true, name: true, description: true }
        }
      },
      // ✅ เรียงตาม Role ID (หรือ Name)
      orderBy: { roleId: "asc" },
    });
    
    // จัด Format ข้อมูลเล็กน้อย (Flatten Role Name)
    const formatted = configs.map(c => ({
        ...c,
        roleName: c.role.name,
        roleDescription: c.role.description
    }));

    return res.json({ success: true, data: formatted });
  } catch (error) {
    console.error("Get Config Error:", error);
    return res.status(500).json({ error: "Failed to retrieve configurations" });
  }
};
